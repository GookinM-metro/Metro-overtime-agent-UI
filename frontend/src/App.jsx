import React, { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import Chart from 'chart.js/auto';
import {
  RefreshCw,
  Moon,
  Sun,
  Clock,
  Briefcase,
  DollarSign,
  AlertTriangle,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Database,
  Search,
  Download,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Bot,
  Trash2,
  Send,
  Brain,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

// --- STYLES AND CONFIGS ---
const DRIVER_METADATA = {
  understaffing: { label: "Understaffing", color: "#a05da5" }, /* Metro Purple */
  outages: { label: "System Outages", color: "#0072bc" },       /* Metro Blue */
  seasonality: { label: "Seasonal Peaks", color: "#e3131b" },   /* Metro Red */
  backlog: { label: "Backlog Clearance", color: "#f7b618" },   /* Metro Gold */
  others: { label: "Other Events", color: "#64748b" }
};

const ALL_DRIVERS_KEYS = ["understaffing", "outages", "seasonality", "backlog", "others"];

const DEPARTMENTS_LIST = [
  "CONGESTION REDUCTION",
  "EXECUTIVE OFFICE, SHARED MOBILITY",
  "DPS CARE-BASED SERVICE DEPARTMENT",
  "SYSTEM SECURITY DEPARTMENT",
  "EMERGENCY SECURITY OPERATIONS CENTER",
  "OFFICE THE CHIEF OF POLICE",
  "EXECUTIVE OFFICE, ADMINISTRATION AND DEVELOPMENT",
  "VEHICLE ENGINEERING & ACQUISITION",
  "CHIEF OPERATIONS OFFICE",
  "VEHICLE MAINTENANCE AND ENGINEERING",
  "SERVICE DEVELOPMENT & SCHEDULING",
  "WORKFORCE MANAGEMENT",
  "INFORMATION TECHNOLOGY SERVICES",
  "BUS TRANSIT OPERATIONS",
  "CENTRAL OPERATIONS, TRANSIT SERVICE DELIVERY",
  "EXECUTIVE DIRECTOR, BUS MAINTENANCE",
  "FACILITIES CONTRACTED MAINTENANCE & OPS CONTRACTS",
  "FACILITIES",
  "MOTORIST SERVICES & REGIONAL SHARED MOBILITY PRGMS",
  "OPERATIONS STRATEGIC INITIATIVE",
  "BUS DIVISION MAINTENANCE",
  "CONTRACT SERVICES",
  "MICROTRANSIT OPERATIONS",
  "EXECUTIVE DIRECTOR, MAINTENANCE AND ENGINEERING",
  "RAIL MAINTENANCE OF WAY & MOW ENGINEERING",
  "EXECUTIVE DIRECTOR, RAIL MAINTENANCE",
  "RAIL FLEET SERVICES MAINTENANCE",
  "EXECUTIVE OFFICE, TRANSIT SERVICE DELIVERY",
  "RAIL TRANSIT OPERATIONS",
  "ITS/SPEED & RELIABILITY GROUP"
];

function formatLogDate(dateStr) {
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
  }
  return dateStr;
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + " " + word;
    const width = ctx.measureText(testLine).width;
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Helper to calculate the perfect Y-axis min/max range to fit the visible datasets inside an X-axis range
function calculateYRangeForXRange(chart, startX, endX) {
  let minVal = Infinity;
  let maxVal = -Infinity;
  
  chart.data.datasets.forEach(dataset => {
    if (dataset.hidden) return;
    const data = dataset.data || [];
    data.forEach(pt => {
      if (pt.x >= startX - 0.01 && pt.x <= endX + 0.01 && pt.y !== null && !isNaN(pt.y)) {
        if (pt.y < minVal) minVal = pt.y;
        if (pt.y > maxVal) maxVal = pt.y;
      }
    });
  });
  
  if (minVal === Infinity || maxVal === -Infinity) {
    return { min: 0, max: 20 };
  }
  
  let finalMin = minVal > 0 ? 0 : Math.floor(minVal);
  if (minVal <= 0 && minVal - finalMin < 0.15) {
    finalMin -= 1;
  }
  
  let finalMax = Math.ceil(maxVal);
  if (finalMax - maxVal < 0.15) {
    finalMax += 1;
  }
  
  if (finalMin === finalMax) {
    finalMin = finalMin > 0 ? finalMin - 1 : finalMin;
    finalMax = finalMax + 1;
  }
  
  return { min: finalMin, max: finalMax };
}

// Helpers for linear cutoffs during predictions and checkbox line transitions
function cutDatasetAtProgress(data, progress) {
  if (progress >= 1.0) return data;
  if (progress <= 0.0) {
    const result = data.filter(pt => pt.x <= 5.0);
    const junePt = result.find(pt => pt.x === 5.0);
    if (junePt) {
      result.push({ x: 5.5, y: junePt.y, year: junePt.year });
    }
    return result;
  }
  
  const x_cut = 5.0 + 6.5 * progress;
  const result = [];
  
  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    if (pt.x <= x_cut) {
      result.push({ x: pt.x, y: pt.y, year: pt.year });
    } else {
      const prevPt = data[i - 1];
      if (prevPt) {
        const t = (x_cut - prevPt.x) / (pt.x - prevPt.x);
        const interpolatedY = prevPt.y + t * (pt.y - prevPt.y);
        result.push({ x: x_cut, y: parseFloat(interpolatedY.toFixed(2)), year: prevPt.year });
      }
      break;
    }
  }
  return result;
}

function cutFullDatasetAtProgress(data, progress) {
  if (progress >= 1.0) return data;
  if (progress <= 0.0) return [];
  if (!data || data.length === 0) return [];
  
  const minX = data[0].x;
  const maxX = data[data.length - 1].x;
  const x_cut = minX + (maxX - minX) * progress;
  
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const pt = data[i];
    if (pt.x <= x_cut) {
      result.push({ x: pt.x, y: pt.y, year: pt.year });
    } else {
      const prevPt = data[i - 1];
      if (prevPt) {
        if (Math.abs(prevPt.x - x_cut) > 0.0001) {
          const t = (x_cut - prevPt.x) / (pt.x - prevPt.x);
          const interpolatedY = prevPt.y + t * (pt.y - prevPt.y);
          result.push({ x: x_cut, y: parseFloat(interpolatedY.toFixed(2)), year: prevPt.year });
        }
      }
      break;
    }
  }
  return result;
}

function extendDatasetToEdges(percentages, dataYear) {
  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < percentages.length; i++) {
    if (percentages[i] !== null) {
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
  }
  if (firstIdx === -1) return [];
  
  const data = [];
  data.push({ x: firstIdx - 0.5, y: percentages[firstIdx], year: dataYear });
  for (let i = firstIdx; i <= lastIdx; i++) {
    data.push({ x: i, y: percentages[i], year: dataYear });
    if (i === 5 && percentages[6] !== null && percentages[5] !== null) {
      const midY = parseFloat(((percentages[5] + percentages[6]) / 2).toFixed(2));
      data.push({ x: 5.5, y: midY, year: dataYear });
    }
  }
  data.push({ x: lastIdx + 0.5, y: percentages[lastIdx], year: dataYear });
  return data;
}

function getTimeframeSlice(timeframe, year) {
  if (timeframe === "q1") return { start: 0, end: 3 };
  if (timeframe === "q2") return { start: 3, end: 6 };
  if (timeframe === "q3") return { start: 6, end: 9 };
  if (timeframe === "q4") return { start: 9, end: 12 };
  if (timeframe === "h1") return { start: 0, end: 6 };
  if (timeframe === "h2") return { start: 6, end: 12 };
  if (timeframe === "ytd") return { start: 0, end: year === 2026 ? 6 : 12 };
  return { start: 0, end: 12 }; // full
}

export default function App() {
  // --- STATE DEFINITIONS ---
  const [department, setDepartment] = useState("all");
  const [union, setUnion] = useState("all");
  const [year, setYear] = useState(2026);
  const [timeframe, setTimeframe] = useState("ytd");
  const [enabledDrivers, setEnabledDrivers] = useState(ALL_DRIVERS_KEYS);
  
  // Checkbox settings
  const [showPredictions, setShowPredictions] = useState(true);
  const [showVacancies, setShowVacancies] = useState(true);
  const [showOtHours, setShowOtHours] = useState(true);
  const [showPay, setShowPay] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  // Table configs
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortField, setSortField] = useState("department");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pageInputValue, setPageInputValue] = useState("1");

  // Theme settings
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true"; // Default to false (light mode) if not set
  });

  // Sync state
  const [syncStatus, setSyncStatus] = useState("Sync"); // "Sync" | "Syncing..." | "Synced"
  const [isSyncSpinning, setIsSyncSpinning] = useState(false);

  // Responsive state
  const [isMobileLayout, setIsMobileLayout] = useState(window.innerWidth <= 1150);
  const [metricCardWidth, setMetricCardWidth] = useState(280);

  // Diagnostic log to track render rate
  console.log("App rendered. Card width is currently:", metricCardWidth);

  // Fetch data containers
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    avgVacancies: 0,
    totalCost: 0,
    primaryDriver: "Loading...",
    driverSubtext: ""
  });
  const [trends, setTrends] = useState({
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    vacancyRate: Array(12).fill(null),
    otHoursRate: Array(12).fill(null),
    otPayRate: Array(12).fill(null)
  });
  const [drivers, setDrivers] = useState({
    understaffing: 0,
    outages: 0,
    seasonality: 0,
    backlog: 0,
    others: 0
  });
  const [eventsList, setEventsList] = useState([]);
  const [vacanciesData, setVacanciesData] = useState({
    rows: [],
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    startIndex: 0,
    endIndex: 0
  });

  // Chat message containers
  const [chatMessages, setChatMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatHistory");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading chat history from localStorage:", e);
      return [];
    }
  });
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStatusText, setThinkingStatusText] = useState("");
  const [chatInputText, setChatInputText] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);

  // --- REFS FOR CHARTS AND ANIMATIONS ---
  const trendChartCanvasRef = useRef(null);
  const trendChartInstanceRef = useRef(null);
  const driversChartCanvasRef = useRef(null);
  const driversChartInstanceRef = useRef(null);
  const chatMessagesContainerRef = useRef(null);
  const metricsGridRef = useRef(null);
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef(null);

  // Sync references to solve closure lag on Chart.js callbacks
  const eventsListRef = useRef([]);
  const yearRef = useRef(2026);
  const dataYearRef = useRef(2026);
  const timeframeRef = useRef("ytd");
  const departmentRef = useRef("all");
  const darkModeRef = useRef(false);
  const showEventsRef = useRef(true);

  // Progress variables for animation (stored in refs for smooth imperativeness)
  const progressRef = useRef({
    predictionsProgress: 1.0,
    vacancyProgress: 1.0,
    hoursProgress: 1.0,
    payProgress: 1.0,
    eventsProgress: 1.0
  });

  const animationIdsRef = useRef({
    scaleAnimationId: null,
    predictionsAnimationId: null,
    vacancyAnimationId: null,
    hoursAnimationId: null,
    payAnimationId: null,
    eventsAnimationId: null
  });

  const onAskAgentRef = useRef(null);

  // Dynamic timeframe labels
  const getTimeframeLabel = (tf, currentYear) => {
    switch (tf) {
      case "q1": return `Q1 ${currentYear}`;
      case "q2": return `Q2 ${currentYear}`;
      case "q3": return `Q3 ${currentYear}`;
      case "q4": return `Q4 ${currentYear}`;
      case "h1": return `H1 ${currentYear}`;
      case "h2": return `H2 ${currentYear}`;
      case "ytd": return "YTD";
      case "full": return "Full Year";
      default: return "YTD";
    }
  };

  // --- DEBOUNCE SEARCH ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // --- RESPONSIVE LAYOUT RESIZER ---
  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth <= 1150);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- METRIC CARD RESIZER ---
  useEffect(() => {
    const updateWidth = () => {
      if (metricsGridRef.current) {
        const firstCard = metricsGridRef.current.querySelector('.metric-card');
        if (firstCard) {
          const roundedWidth = Math.round(firstCard.getBoundingClientRect().width);
          setMetricCardWidth((prev) => (prev !== roundedWidth ? roundedWidth : prev));
        }
      }
    };
    
    // Run on mount and after a short delay to let layout settle
    updateWidth();
    const timer = setTimeout(updateWidth, 150);

    window.addEventListener('resize', updateWidth);
    return () => {
      window.removeEventListener('resize', updateWidth);
      clearTimeout(timer);
    };
  }, []);

  // --- UPDATE REFS ---
  useEffect(() => { eventsListRef.current = eventsList; }, [eventsList]);
  useEffect(() => { departmentRef.current = department; }, [department]);
  useEffect(() => { darkModeRef.current = darkMode; }, [darkMode]);
  useEffect(() => { showEventsRef.current = showEvents; }, [showEvents]);

  // --- API LOGIC (FETCH DATA) ---
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboard?department=${encodeURIComponent(department)}&year=${year}&timeframe=${encodeURIComponent(timeframe)}&union=${encodeURIComponent(union)}`);
      if (response.ok) {
        const data = await response.json();
        dataYearRef.current = year;
        setMetrics(data.metrics);
        setTrends(data.trends);
        setDrivers(data.drivers);
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      throw err;
    }
  }, [department, year, timeframe, union]);

  const fetchEventsData = useCallback(async () => {
    try {
      const response = await fetch(`/api/events?department=${encodeURIComponent(department)}&year=${year}`);
      if (response.ok) {
        const data = await response.json();
        setEventsList(data);
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
      throw err;
    }
  }, [department, year]);

  const fetchVacanciesData = useCallback(async () => {
    try {
      const response = await fetch(`/api/vacancies-table?department=${encodeURIComponent(department)}&year=${year}&timeframe=${encodeURIComponent(timeframe)}&union=${encodeURIComponent(union)}&search=${encodeURIComponent(debouncedSearchQuery)}&sortField=${encodeURIComponent(sortField)}&sortOrder=${encodeURIComponent(sortOrder)}&page=${currentPage}&rowsPerPage=${rowsPerPage}`);
      if (response.ok) {
        const data = await response.json();
        setVacanciesData(data);
      } else {
        throw new Error(`HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch vacancies:", err);
      throw err;
    }
  }, [department, year, timeframe, union, debouncedSearchQuery, sortField, sortOrder, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchDashboardData().catch(() => {});
    fetchEventsData().catch(() => {});
  }, [fetchDashboardData, fetchEventsData]);

  useEffect(() => {
    fetchVacanciesData().catch(() => {});
  }, [fetchVacanciesData]);

  const tableSectionRef = useRef(null);

  const scrollToTable = () => {
    setTimeout(() => {
      if (tableSectionRef.current) {
        tableSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  const commitPageChange = (val) => {
    const pageNum = parseInt(val, 10);
    const maxPages = vacanciesData.totalPages || 1;
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
      setCurrentPage(pageNum);
      scrollToTable();
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  const handlePageInputBlur = () => {
    commitPageChange(pageInputValue);
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitPageChange(pageInputValue);
    }
  };


  // --- SYNC DATA BUTTON ---
  const handleSyncData = async () => {
    setSyncStatus("Syncing...");
    setIsSyncSpinning(true);
    // Guarantee a minimum of 800ms visual spin-feedback so fast local requests don't look instant or broken
    const delayPromise = new Promise((resolve) => setTimeout(resolve, 800));
    try {
      // First trigger backend BigQuery refresh
      const refreshRes = await fetch("/api/refresh", { method: "POST" });
      if (!refreshRes.ok) {
        throw new Error("Failed to refresh BigQuery on backend");
      }
      
      await Promise.all([
        fetchDashboardData(),
        fetchEventsData(),
        fetchVacanciesData(),
        delayPromise
      ]);
      setSyncStatus("Synced");
    } catch (err) {
      console.error("Sync failed:", err);
      setSyncStatus("Error");
    } finally {
      setIsSyncSpinning(false);
      setTimeout(() => {
        setSyncStatus("Sync");
      }, 1500);
    }
  };

  // --- CHART 1: MAIN TREND CHART DRAWING ---
  const updateTrendChart = useCallback(() => {
    const chart = trendChartInstanceRef.current;
    if (!chart) return;

    const slice = getTimeframeSlice(timeframeRef.current, dataYearRef.current);
    const months = trends.months;

    // Filter predictions values out if disabled
    let vacancyPercentages = [...trends.vacancyRate];
    let hoursPercentages = [...trends.otHoursRate];
    let payPercentages = [...trends.otPayRate];

    const includePredictions = showPredictions || (dataYearRef.current === 2026 && progressRef.current.predictionsProgress > 0.0);
    if (dataYearRef.current === 2026 && !includePredictions) {
      for (let i = 6; i < 12; i++) {
        vacancyPercentages[i] = null;
        hoursPercentages[i] = null;
        payPercentages[i] = null;
      }
    }

    // Extend and slide datasets
    let vacancyData = extendDatasetToEdges(vacancyPercentages, dataYearRef.current);
    let hoursData = extendDatasetToEdges(hoursPercentages, dataYearRef.current);
    let payData = extendDatasetToEdges(payPercentages, dataYearRef.current);

    if (dataYearRef.current === 2026) {
      vacancyData = cutDatasetAtProgress(vacancyData, progressRef.current.predictionsProgress);
      hoursData = cutDatasetAtProgress(hoursData, progressRef.current.predictionsProgress);
      payData = cutDatasetAtProgress(payData, progressRef.current.predictionsProgress);
    }

    vacancyData = cutFullDatasetAtProgress(vacancyData, progressRef.current.vacancyProgress);
    hoursData = cutFullDatasetAtProgress(hoursData, progressRef.current.hoursProgress);
    payData = cutFullDatasetAtProgress(payData, progressRef.current.payProgress);

    const isDark = darkModeRef.current;

    // Apply data and options updates
    chart.data.labels = months;
    chart.data.datasets[0].data = vacancyData;
    chart.data.datasets[0].hidden = !showVacancies && progressRef.current.vacancyProgress === 0.0;
    chart.data.datasets[1].data = hoursData;
    chart.data.datasets[1].hidden = !showOtHours && progressRef.current.hoursProgress === 0.0;
    chart.data.datasets[2].data = payData;
    chart.data.datasets[2].hidden = !showPay && progressRef.current.payProgress === 0.0;

    // Style elements based on theme
    chart.data.datasets.forEach(dataset => {
      const strokeColor = dataset.borderColor;
      dataset.pointBorderColor = (ctx) => {
        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
        const ptYear = rawPoint && typeof rawPoint === 'object' ? rawPoint.year : null;
        if (ptYear === 2026 && xVal !== null && xVal > 5.1) {
          return strokeColor;
        }
        return isDark ? '#07080d' : '#ffffff';
      };
      dataset.pointBackgroundColor = (ctx) => {
        const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
        const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
        const ptYear = rawPoint && typeof rawPoint === 'object' ? rawPoint.year : null;
        if (ptYear === 2026 && xVal !== null && xVal > 5.1) {
          return isDark ? '#0d0f1a' : '#ffffff';
        }
        return strokeColor;
      };
    });

    chart.options.plugins.tooltip.backgroundColor = isDark ? '#12131a' : '#ffffff';
    chart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
    chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
    chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    
    chart.options.scales.y.grid.color = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    chart.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#475569';
    chart.options.scales.y.title.color = isDark ? '#94a3b8' : '#475569';

    // Trigger scale pan or quick redraw
    const yearChanged = chart.lastSelectedYear !== yearRef.current;
    chart.lastSelectedYear = yearRef.current;

    if (yearChanged) {
      if (animationIdsRef.current.scaleAnimationId) {
        cancelAnimationFrame(animationIdsRef.current.scaleAnimationId);
        animationIdsRef.current.scaleAnimationId = null;
      }
      chart.options.scales.x.min = slice.start - 0.5;
      chart.options.scales.x.max = slice.end - 0.5;

      const targetYRange = calculateYRangeForXRange(chart, slice.start - 0.5, slice.end - 0.5);
      chart.options.scales.y.min = targetYRange.min;
      chart.options.scales.y.max = targetYRange.max;

      chart.update('none');
    } else {
      // Smoothly pan scale range
      animateTrendChartScale(chart, slice.start - 0.5, slice.end - 0.5, 750);
    }
  }, [trends, showPredictions, showVacancies, showOtHours, showPay]);

  useEffect(() => {
    yearRef.current = year;
    updateTrendChart();
  }, [year, updateTrendChart]);

  useEffect(() => {
    timeframeRef.current = timeframe;
    updateTrendChart();
  }, [timeframe, updateTrendChart]);

  // Custom animation engine to smoothly pan scale limits frame-by-frame
  const animateTrendChartScale = (chart, targetMin, targetMax, durationMs = 750) => {
    if (animationIdsRef.current.scaleAnimationId) {
      cancelAnimationFrame(animationIdsRef.current.scaleAnimationId);
      animationIdsRef.current.scaleAnimationId = null;
    }
    
    chart.stop();
    
    let startMin = typeof chart.options.scales.x.min === 'number' ? chart.options.scales.x.min : targetMin;
    let startMax = typeof chart.options.scales.x.max === 'number' ? chart.options.scales.x.max : targetMax;
    
    if (startMin === targetMin && startMax === targetMax) {
      chart.options.scales.x.min = targetMin;
      chart.options.scales.x.max = targetMax;
      
      const targetYRange = calculateYRangeForXRange(chart, targetMin, targetMax);
      chart.options.scales.y.min = targetYRange.min;
      chart.options.scales.y.max = targetYRange.max;
      
      chart.update();
      return;
    }
    
    const startMinY = typeof chart.options.scales.y.min === 'number' ? chart.options.scales.y.min : calculateYRangeForXRange(chart, startMin, startMax).min;
    const startMaxY = typeof chart.options.scales.y.max === 'number' ? chart.options.scales.y.max : calculateYRangeForXRange(chart, startMin, startMax).max;
    
    const targetYRange = calculateYRangeForXRange(chart, targetMin, targetMax);
    const targetMinY = targetYRange.min;
    const targetMaxY = targetYRange.max;
    
    const startTime = performance.now();
    
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Ease-In-Out Cubic
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentMin = startMin + (targetMin - startMin) * ease;
      const currentMax = startMax + (targetMax - startMax) * ease;
      
      const currentMinY = startMinY + (targetMinY - startMinY) * ease;
      const currentMaxY = startMaxY + (targetMaxY - startMaxY) * ease;
      
      chart.options.scales.x.min = currentMin;
      chart.options.scales.x.max = currentMax;
      chart.options.scales.y.min = currentMinY;
      chart.options.scales.y.max = currentMaxY;
      
      chart.update('none');
      
      if (progress < 1) {
        animationIdsRef.current.scaleAnimationId = requestAnimationFrame(step);
      } else {
        chart.options.scales.x.min = targetMin;
        chart.options.scales.x.max = targetMax;
        chart.options.scales.y.min = targetMinY;
        chart.options.scales.y.max = targetMaxY;
        chart.update('none');
        animationIdsRef.current.scaleAnimationId = null;
      }
    }
    
    animationIdsRef.current.scaleAnimationId = requestAnimationFrame(step);
  };

  // --- GENERALIZED CHECKBOX ANIMATOR ---
  const animateLine = useCallback((key, show) => {
    const animKey = `${key}AnimationId`;
    const progKey = `${key}Progress`;
    
    if (animationIdsRef.current[animKey]) {
      cancelAnimationFrame(animationIdsRef.current[animKey]);
      animationIdsRef.current[animKey] = null;
    }
    
    const duration = 600;
    const startProgress = progressRef.current[progKey];
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const ratio = Math.min(elapsed / duration, 1.0);
      const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
      
      progressRef.current[progKey] = startProgress + (targetProgress - startProgress) * ease;
      
      updateTrendChart();
      
      if (ratio < 1.0) {
        animationIdsRef.current[animKey] = requestAnimationFrame(step);
      } else {
        progressRef.current[progKey] = targetProgress;
        animationIdsRef.current[animKey] = null;
        updateTrendChart();
      }
    }
    
    animationIdsRef.current[animKey] = requestAnimationFrame(step);
  }, [updateTrendChart]);

  // Custom animator for predictions
  const animatePredictions = useCallback((show) => {
    if (animationIdsRef.current.predictionsAnimationId) {
      cancelAnimationFrame(animationIdsRef.current.predictionsAnimationId);
      animationIdsRef.current.predictionsAnimationId = null;
    }
    
    const duration = 600;
    const startProgress = progressRef.current.predictionsProgress;
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const ratio = Math.min(elapsed / duration, 1.0);
      const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
      
      progressRef.current.predictionsProgress = startProgress + (targetProgress - startProgress) * ease;
      
      updateTrendChart();
      
      if (ratio < 1.0) {
        animationIdsRef.current.predictionsAnimationId = requestAnimationFrame(step);
      } else {
        progressRef.current.predictionsProgress = targetProgress;
        animationIdsRef.current.predictionsAnimationId = null;
        updateTrendChart();
      }
    }
    
    animationIdsRef.current.predictionsAnimationId = requestAnimationFrame(step);
  }, [updateTrendChart]);

  // Custom animator for events overlay
  const animateEvents = useCallback((show) => {
    if (animationIdsRef.current.eventsAnimationId) {
      cancelAnimationFrame(animationIdsRef.current.eventsAnimationId);
      animationIdsRef.current.eventsAnimationId = null;
    }
    
    const duration = 600;
    const startProgress = progressRef.current.eventsProgress;
    const targetProgress = show ? 1.0 : 0.0;
    
    if (startProgress === targetProgress) return;
    
    const startTime = performance.now();
    
    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const ratio = Math.min(elapsed / duration, 1.0);
      const ease = ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
      
      progressRef.current.eventsProgress = startProgress + (targetProgress - startProgress) * ease;
      
      updateTrendChart();
      
      if (ratio < 1.0) {
        animationIdsRef.current.eventsAnimationId = requestAnimationFrame(step);
      } else {
        progressRef.current.eventsProgress = targetProgress;
        animationIdsRef.current.eventsAnimationId = null;
        updateTrendChart();
      }
    }
    
    animationIdsRef.current.eventsAnimationId = requestAnimationFrame(step);
  }, [updateTrendChart]);

  // Bind animation updates to state adjustments
  useEffect(() => {
    animateLine("vacancy", showVacancies);
  }, [showVacancies, animateLine]);

  useEffect(() => {
    animateLine("hours", showOtHours);
  }, [showOtHours, animateLine]);

  useEffect(() => {
    animateLine("pay", showPay);
  }, [showPay, animateLine]);

  useEffect(() => {
    if (year === 2026) {
      animatePredictions(showPredictions);
    } else {
      updateTrendChart();
    }
  }, [showPredictions, year, animatePredictions, updateTrendChart]);

  useEffect(() => {
    animateEvents(showEvents);
  }, [showEvents, animateEvents]);

  // --- CUSTOM CANVAS OVERLAY EVENT PLUGIN ---
  useEffect(() => {
    if (!trendChartCanvasRef.current) return;

    const ctx = trendChartCanvasRef.current.getContext('2d');
    const slice = getTimeframeSlice(timeframe, year);

    const eventOverlayPlugin = {
      id: 'eventOverlay',
      beforeDraw: (chart) => {
        const isDark = darkModeRef.current;
        let dotBorderColor = isDark ? '#07080d' : '#ffffff';

        chart.data.datasets.forEach(dataset => {
          const strokeColor = dataset.borderColor;
          dataset.pointBorderColor = (ctx) => {
            const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
            const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
            if (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) {
              return strokeColor;
            }
            return dotBorderColor;
          };
          dataset.pointBackgroundColor = (ctx) => {
            const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
            const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
            if (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) {
              return isDark ? '#0d0f1a' : '#ffffff';
            }
            return strokeColor;
          };
        });

        // Flatten curve controls around June-July prediction transitions in 2026
        if (dataYearRef.current === 2026) {
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (meta && meta.data) {
              meta.data.forEach((pt, idx) => {
                const raw = dataset.data[idx];
                const xVal = raw && typeof raw === 'object' ? raw.x : null;
                if (xVal === 5.0) {
                  pt.cp2x = pt.x;
                  pt.cp2y = pt.y;
                } else if (xVal === 5.5) {
                  pt.cp1x = pt.x;
                  pt.cp1y = pt.y;
                  pt.cp2x = pt.x;
                  pt.cp2y = pt.y;
                } else if (xVal === 6.0) {
                  pt.cp1x = pt.x;
                  pt.cp1y = pt.y;
                } else if (xVal > 5.0 && xVal < 6.0) {
                  pt.cp1x = pt.x;
                  pt.cp1y = pt.y;
                }
              });
            }
          });
        }

        const hasHoveredEvent = !!(chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0));
        if (!showEventsRef.current && progressRef.current.eventsProgress === 0.0 && !hasHoveredEvent) return;

        const { ctx: canvasCtx, chartArea } = chart;
        if (!chartArea) return;

        const months = chart.data.labels;
        canvasCtx.save();
        
        canvasCtx.beginPath();
        canvasCtx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        canvasCtx.clip();

        eventsListRef.current.forEach(ev => {
          const isHovered = (chart.hoveredEvents && chart.hoveredEvents.includes(ev)) || (chart.hoveredEvent === ev);
          
          canvasCtx.globalAlpha = isHovered ? 1.0 : progressRef.current.eventsProgress;
          if (canvasCtx.globalAlpha === 0.0) return;

          const monthStr = ev.date.substring(0, 3);
          const monthIndex = months.indexOf(monthStr);
          if (monthIndex === -1) return;

          const daysPart = ev.date.substring(4);
          let startDay = 1;
          let endDay = 1;
          if (daysPart.includes("-")) {
            const parts = daysPart.split("-");
            startDay = parseInt(parts[0], 10);
            endDay = parseInt(parts[1], 10);
          } else {
            startDay = parseInt(daysPart, 10);
            endDay = startDay;
          }

          const daysInMonthMap = {
            Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
            Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
          };
          const totalDays = daysInMonthMap[monthStr] || 30;

          const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
          const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;

          const startX = chart.scales.x.getPixelForValue(startVal);
          const endX = chart.scales.x.getPixelForValue(endVal);

          let colorHex = "#0072bc"; /* Metro Blue */
          let bgHex = "rgba(0, 114, 188, 0.05)";

          if (ev.type === "operations") {
            colorHex = "#58a738"; /* Metro Green */
            bgHex = isHovered ? "rgba(88, 167, 56, 0.18)" : "rgba(88, 167, 56, 0.05)";
          } else if (ev.type === "market") {
            colorHex = "#e3131b"; /* Metro Red */
            bgHex = isHovered ? "rgba(227, 19, 27, 0.18)" : "rgba(227, 19, 27, 0.05)";
          } else {
            bgHex = isHovered ? "rgba(0, 114, 188, 0.18)" : "rgba(0, 114, 188, 0.05)";
          }

          if (startDay !== endDay) {
            canvasCtx.fillStyle = bgHex;
            canvasCtx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);

            canvasCtx.strokeStyle = colorHex;
            canvasCtx.lineWidth = isHovered ? 2.5 : 1.5;
            canvasCtx.setLineDash(ev.upcoming ? [2, 3] : [4, 4]);
            canvasCtx.beginPath();
            canvasCtx.moveTo(startX, chartArea.top);
            canvasCtx.lineTo(startX, chartArea.bottom);
            canvasCtx.moveTo(endX, chartArea.top);
            canvasCtx.lineTo(endX, chartArea.bottom);
            canvasCtx.stroke();
          } else {
            canvasCtx.strokeStyle = colorHex;
            canvasCtx.lineWidth = isHovered ? 2.5 : 1.5;
            canvasCtx.setLineDash(ev.upcoming ? [2, 3] : [4, 4]);
            canvasCtx.beginPath();
            canvasCtx.moveTo(startX, chartArea.top);
            canvasCtx.lineTo(startX, chartArea.bottom);
            canvasCtx.stroke();
          }
          canvasCtx.setLineDash([]);
        });

        canvasCtx.restore();
      },

      afterDatasetsDraw: (chart) => {
        const hasHoveredEvent = !!(chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0));
        if (!showEventsRef.current && progressRef.current.eventsProgress === 0.0 && !hasHoveredEvent) return;

        const { ctx: canvasCtx, chartArea } = chart;
        if (!chartArea) return;

        const slideOffset = (1.0 - progressRef.current.eventsProgress) * chartArea.height;
        const months = chart.data.labels;
        const isDark = darkModeRef.current;
        const tracker = document.getElementById("theme-transition-tracker");
        let badgeBg = isDark ? "#0c0d16" : "#ffffff";
        let badgeTextHover = isDark ? "#ffffff" : "#0f172a";
        if (tracker) {
          const comp = window.getComputedStyle(tracker);
          badgeBg = comp.backgroundColor;
          badgeTextHover = comp.color;
        }

        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        canvasCtx.clip();

        let visibleEventIndex = 0;
        eventsListRef.current.forEach(ev => {
          const isHovered = (chart.hoveredEvents && chart.hoveredEvents.includes(ev)) || (chart.hoveredEvent === ev);
          
          if (!isHovered && progressRef.current.eventsProgress === 0.0) {
            visibleEventIndex++;
            return;
          }

          const monthStr = ev.date.substring(0, 3);
          const monthIndex = months.indexOf(monthStr);
          if (monthIndex === -1) {
            visibleEventIndex++;
            return;
          }

          const daysPart = ev.date.substring(4);
          let startDay = 1;
          if (daysPart.includes("-")) {
            startDay = parseInt(daysPart.split("-")[0], 10);
          } else {
            startDay = parseInt(daysPart, 10);
          }

          const daysInMonthMap = {
            Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
            Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
          };
          const totalDays = daysInMonthMap[monthStr] || 30;
          const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
          const startX = chart.scales.x.getPixelForValue(startVal);

          let colorHex = "#0072bc";
          if (ev.type === "operations") {
            colorHex = "#58a738";
          } else if (ev.type === "market") {
            colorHex = "#e3131b";
          }

          canvasCtx.save();
          canvasCtx.font = isHovered ? "bold 10px Outfit" : "600 9px Outfit";
          const maxLabelLength = 18;
          const displayName = ev.name.length > maxLabelLength ? ev.name.substring(0, maxLabelLength - 3) + "..." : ev.name;
          const textWidth = canvasCtx.measureText(displayName).width;

          const yOffsetBase = 12 + (visibleEventIndex % 2) * 22;
          visibleEventIndex++;

          const eventSlideOffset = isHovered ? 0 : slideOffset;
          canvasCtx.translate(startX + 11, chartArea.top + yOffsetBase - eventSlideOffset);
          canvasCtx.rotate(Math.PI / 2);

          canvasCtx.fillStyle = badgeBg;
          canvasCtx.beginPath();

          const padX = isHovered ? 8 : 6;
          const padY = isHovered ? 10 : 8;
          const badgeHeight = isHovered ? 14 : 12;

          if (canvasCtx.roundRect) {
            canvasCtx.roundRect(-padX, -padY, textWidth + padX * 2, badgeHeight, 5);
          } else {
            canvasCtx.rect(-padX, -padY, textWidth + padX * 2, badgeHeight);
          }
          canvasCtx.fill();

           canvasCtx.strokeStyle = colorHex;
          canvasCtx.lineWidth = isHovered ? 2 : 1;
          if (ev.upcoming) {
            canvasCtx.setLineDash([2, 2]);
          } else {
            canvasCtx.setLineDash([]);
          }
          canvasCtx.stroke();
          canvasCtx.setLineDash([]);

          canvasCtx.fillStyle = isHovered ? badgeTextHover : colorHex;
          canvasCtx.textBaseline = "middle";
          canvasCtx.fillText(displayName, 0, badgeHeight / 2 - padY);
          canvasCtx.restore();
        });

        canvasCtx.restore();
      },

      afterDraw: (chart) => {
        const hasHoveredEvent = !!(chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0));
        if (!showEventsRef.current && progressRef.current.eventsProgress === 0.0 && !hasHoveredEvent) return;

        const { ctx: canvasCtx, chartArea } = chart;
        if (!chartArea) return;

        const isDark = darkModeRef.current;
        const hoveredEvents = (chart.hoveredEvents && chart.hoveredEvents.length > 0)
          ? chart.hoveredEvents
          : (chart.hoveredEvent ? [chart.hoveredEvent] : []);

        // Joint hovering of event detail boxes + data dots
        if (hoveredEvents.length > 0 && chart.hoveredMousePos) {
          const mPos = chart.hoveredMousePos;
          canvasCtx.save();

          const tooltipW = 230;
          const spacing = 8;

          canvasCtx.font = "bold 13px Outfit";
          const cardInfos = hoveredEvents.map(ev => {
            const lines = wrapText(canvasCtx, ev.name, tooltipW - 28);
            let height = 58 + (lines.length - 1) * 15;
            if (ev.upcoming) {
              height += 14;
            }
            return { ev, lines, height };
          });

          const totalStackH = cardInfos.reduce((sum, info) => sum + info.height, 0) + (hoveredEvents.length - 1) * spacing;

          let tooltipX = mPos.x + 15;
          let tooltipY = mPos.y - (totalStackH / 2);

          if (tooltipX + tooltipW > chartArea.right) {
            tooltipX = mPos.x - tooltipW - 15;
          }
          if (tooltipY + totalStackH > chartArea.bottom) {
            tooltipY = chartArea.bottom - totalStackH - 10;
          }
          if (tooltipY < chartArea.top) {
            tooltipY = chartArea.top + 10;
          }

          // Dodge standard Chart.js dots hover tooltip
          const chartTooltip = chart.tooltip;
          if (chartTooltip && chartTooltip.opacity > 0) {
            const tX = chartTooltip.x;
            const tY = chartTooltip.y;
            const tW = chartTooltip.width || 140;
            const tH = chartTooltip.height || 100;

            const overlapX = (tooltipX < tX + tW + 10) && (tooltipX + tooltipW + 10 > tX);
            if (overlapX) {
              if (tooltipY + totalStackH / 2 < tY + tH / 2) {
                tooltipY = tY - totalStackH - 10;
              } else {
                tooltipY = tY + tH + 10;
              }

              if (tooltipY < chartArea.top) {
                tooltipY = tY + tH + 10;
              }
              if (tooltipY + totalStackH > chartArea.bottom) {
                tooltipY = tY - totalStackH - 10;
              }
              if (tooltipY < chartArea.top) {
                tooltipY = chartArea.top + 10;
              }
              if (tooltipY + totalStackH > chartArea.bottom) {
                tooltipY = chartArea.bottom - totalStackH - 10;
              }
            }
          }

          let currentY = tooltipY;
          cardInfos.forEach(({ ev, lines, height }) => {
            const cardY = currentY;
            currentY += height + spacing;

            canvasCtx.save();

            let colorHex = "#0072bc";
            let typeText = "IT / Tech Migration";
            if (ev.type === "operations") {
              colorHex = "#58a738";
              typeText = "Operational Audit";
            } else if (ev.type === "market") {
              colorHex = "#e3131b";
              typeText = "Market Peak / Seasonality";
            }

            canvasCtx.shadowColor = isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(148, 163, 184, 0.25)";
            canvasCtx.shadowBlur = 15;
            canvasCtx.shadowOffsetX = 0;
            canvasCtx.shadowOffsetY = 6;

            canvasCtx.fillStyle = isDark ? "#090a10" : "#ffffff";
            canvasCtx.strokeStyle = colorHex;
            canvasCtx.lineWidth = 2;

            canvasCtx.beginPath();
            if (canvasCtx.roundRect) {
              canvasCtx.roundRect(tooltipX, cardY, tooltipW, height, 5);
            } else {
              canvasCtx.rect(tooltipX, cardY, tooltipW, height);
            }
            canvasCtx.fill();
            canvasCtx.stroke();

            canvasCtx.shadowColor = "transparent";
            canvasCtx.shadowBlur = 0;
            canvasCtx.shadowOffsetX = 0;
            canvasCtx.shadowOffsetY = 0;

            canvasCtx.font = "800 8px Inter";
            canvasCtx.fillStyle = colorHex;
            canvasCtx.textBaseline = "top";
            canvasCtx.fillText(typeText.toUpperCase(), tooltipX + 14, cardY + 14);

            canvasCtx.font = "bold 13px Outfit";
            canvasCtx.fillStyle = isDark ? "#ffffff" : "#0f172a";
            lines.forEach((line, lineIdx) => {
              canvasCtx.fillText(line, tooltipX + 14, cardY + 26 + lineIdx * 15);
            });

            canvasCtx.font = "500 9px Inter";
            canvasCtx.fillStyle = isDark ? "#94a3b8" : "#475569";
            let dateY = cardY + 43 + (lines.length - 1) * 15;
            if (ev.upcoming) {
              canvasCtx.font = "bold 8px Inter";
              canvasCtx.fillStyle = isDark ? "#c38fc7" : "#a05da5"; // Metro Purple (Dark/Light adjusted)
              canvasCtx.fillText("UPCOMING", tooltipX + 14, dateY);
              dateY += 14;
            }

            canvasCtx.font = "500 9px Inter";
            canvasCtx.fillStyle = isDark ? "#94a3b8" : "#475569";
            canvasCtx.fillText(`📅 ${ev.date}, ${yearRef.current}`, tooltipX + 14, dateY);

            canvasCtx.restore();
          });
        }
      },

      afterEvent: (chart, args) => {
        const isOverlayEnabled = showEventsRef.current;
        if (!isOverlayEnabled || progressRef.current.eventsProgress < 1.0) {
          if (chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0)) {
            chart.hoveredEvent = null;
            chart.hoveredEvents = null;
            chart.canvas.style.cursor = 'default';
            chart.hoveredMousePos = null;
            args.changed = true;
          }
          return;
        }

        const event = args.event;
        const { ctx: canvasCtx, chartArea, scales } = chart;
        if (!chartArea) return;

        const months = chart.data.labels;

        if (event.type !== 'mousemove' && event.type !== 'mouseout' && event.type !== 'click') {
          return;
        }

        if (event.type === 'click') {
          const hoveredEvents = chart.hoveredEvents || (chart.hoveredEvent ? [chart.hoveredEvent] : []);
          if (hoveredEvents.length > 0 && onAskAgentRef.current) {
            const ev = hoveredEvents[0];
            const monthStr = ev.date.substring(0, 3);
            onAskAgentRef.current(`Explain the impact of the "${ev.name}" event in ${monthStr} ${yearRef.current}.`);
          }
          return;
        }

        const mouseY = event.y;
        const isNearTop = mouseY < chartArea.top + 60;

        const activeElements = chart.getActiveElements();
        const hoveringDot = activeElements && activeElements.length > 0;

        if (event.type === 'mouseout') {
          if (chart.hoveredEvent || (chart.hoveredEvents && chart.hoveredEvents.length > 0)) {
            chart.hoveredEvent = null;
            chart.hoveredEvents = null;
            chart.canvas.style.cursor = 'default';
            chart.hoveredMousePos = null;
            args.changed = true;
          }
          return;
        }

        const mouseX = event.x;
        const inY = mouseY >= chartArea.top && mouseY <= chartArea.bottom;
        const matchingEvents = [];

        if (inY && !hoveringDot) {
          const visibleEvents = eventsListRef.current;
          canvasCtx.save();
          canvasCtx.font = "600 9px Outfit";

          let visibleEventIndex = 0;
          visibleEvents.forEach((ev) => {
            const monthStr = ev.date.substring(0, 3);
            const monthIndex = months.indexOf(monthStr);
            if (monthIndex === -1) return;

            const daysPart = ev.date.substring(4);
            let startDay = 1;
            let endDay = 1;
            if (daysPart.includes("-")) {
              const parts = daysPart.split("-");
              startDay = parseInt(parts[0], 10);
              endDay = parseInt(parts[1], 10);
            } else {
              startDay = parseInt(daysPart, 10);
              endDay = startDay;
            }

            const daysInMonthMap = {
              Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
              Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
            };
            const totalDays = daysInMonthMap[monthStr] || 30;

            const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
            const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;

            const startX = chart.scales.x.getPixelForValue(startVal);
            const endX = chart.scales.x.getPixelForValue(endVal);

            const maxLabelLength = 18;
            const displayName = ev.name.length > maxLabelLength ? ev.name.substring(0, maxLabelLength - 3) + "..." : ev.name;
            const textWidth = canvasCtx.measureText(displayName).width;
            const yOffsetBase = 12 + (visibleEventIndex % 2) * 22;
            const cx = startX + 11;
            const cy = chartArea.top + yOffsetBase;

            const dx = mouseX - cx;
            const dy = mouseY - cy;

            const isOverBadge = (dy >= -6 && dy <= textWidth + 6 && dx >= -4 && dx <= 8);

            if (isOverBadge) {
              matchingEvents.push({ ev, visibleIndex: visibleEventIndex });
            }
            visibleEventIndex++;
          });
          canvasCtx.restore();
        }

        let foundHoverList = matchingEvents.map(item => item.ev);
        let foundHover = foundHoverList.length > 0 ? foundHoverList[0] : null;
        let hoverMousePos = foundHoverList.length > 0 ? { x: mouseX, y: mouseY } : null;

        let hasChanged = false;
        const prevHoveredEvents = chart.hoveredEvents || [];

        if (prevHoveredEvents.length !== foundHoverList.length) {
          hasChanged = true;
        } else {
          for (let i = 0; i < foundHoverList.length; i++) {
            if (prevHoveredEvents[i] !== foundHoverList[i]) {
              hasChanged = true;
              break;
            }
          }
        }

        if (hasChanged) {
          chart.hoveredEvents = foundHoverList;
          chart.hoveredEvent = foundHover;
          chart.canvas.style.cursor = foundHoverList.length > 0 ? 'pointer' : 'default';
          chart.hoveredMousePos = hoverMousePos;
          args.changed = true;
        } else if (foundHoverList.length > 0) {
          chart.hoveredMousePos = hoverMousePos;
          args.changed = true;
        }
      }
    };

    const isDark = darkModeRef.current;

    const config = {
      type: 'line',
      data: {
        labels: trends.months,
        datasets: [
          {
            label: 'Vacancy Rate (%)',
            data: [],
            borderColor: '#0072bc', /* Metro Blue */
            backgroundColor: 'rgba(0, 114, 188, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#0072bc',
            pointBorderColor: isDark ? '#07080d' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
            },
            pointHoverRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
            },
            tension: 0.35,
            fill: true,
            segment: {
              borderDash: ctx => (dataYearRef.current === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
            }
          },
          {
            label: 'Overtime Hours (%)',
            data: [],
            borderColor: '#a05da5', /* Metro Purple */
            backgroundColor: 'rgba(160, 93, 165, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#a05da5',
            pointBorderColor: isDark ? '#07080d' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
            },
            pointHoverRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
            },
            tension: 0.35,
            fill: true,
            segment: {
              borderDash: ctx => (dataYearRef.current === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
            }
          },
          {
            label: 'Overtime Pay (%)',
            data: [],
            borderColor: '#f7b618', /* Metro Gold */
            backgroundColor: 'rgba(247, 182, 24, 0.05)',
            borderWidth: 3,
            pointBackgroundColor: '#f7b618',
            pointBorderColor: isDark ? '#07080d' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 4 : 6;
            },
            pointHoverRadius: ctx => {
              const rawPoint = ctx.dataset && ctx.dataset.data ? ctx.dataset.data[ctx.dataIndex] : null;
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (ctx.parsed ? ctx.parsed.x : null);
              if (xVal !== null && xVal % 1 !== 0) return 0;
              return (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) ? 6 : 8;
            },
            tension: 0.35,
            fill: true,
            segment: {
              borderDash: ctx => (dataYearRef.current === 2026 && ctx.p0 && ctx.p0.parsed && ctx.p0.parsed.x >= 5.5) ? [5, 5] : undefined
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          autoPadding: false,
          padding: { top: 15, bottom: 15, left: 10, right: 15 }
        },
        animation: { duration: 300, easing: 'easeOutCubic' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#12131a' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 5,
            font: { family: 'Inter' },
            filter: function(tooltipItem) {
              const rawPoint = tooltipItem.dataset.data[tooltipItem.dataIndex];
              const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (tooltipItem.parsed ? tooltipItem.parsed.x : null);
              return xVal !== null && xVal !== undefined && xVal % 1 === 0;
            },
            callbacks: {
              title: function(contexts) {
                if (contexts.length === 0) return "";
                const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const rawPoint = contexts[0].dataset && contexts[0].dataset.data ? contexts[0].dataset.data[contexts[0].dataIndex] : null;
                const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (contexts[0].parsed ? contexts[0].parsed.x : null);
                const clampedIndex = Math.max(0, Math.min(11, Math.round(xVal)));
                return monthsList[clampedIndex] || "";
              },
              label: function(context) {
                const val = typeof context.raw === 'object' && context.raw !== null ? context.raw.y : context.raw;
                let suffix = "";
                const rawPoint = context.dataset && context.dataset.data ? context.dataset.data[context.dataIndex] : null;
                const xVal = rawPoint && typeof rawPoint === 'object' ? rawPoint.x : (context.parsed ? context.parsed.x : null);
                if (dataYearRef.current === 2026 && xVal !== null && xVal > 5.1) {
                  suffix = " (Predicted)";
                }
                return ` ${context.dataset.label}: ${val}%${suffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            grid: { display: false },
            ticks: {
              color: '#64748b',
              font: { family: 'Outfit', size: 11, weight: 600 },
              callback: function(value) {
                const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return monthsList[value] || "";
              }
            },
            afterBuildTicks: (axis) => {
              const min = Math.ceil(axis.min);
              const max = Math.floor(axis.max);
              const ticks = [];
              for (let i = min; i <= max; i++) {
                ticks.push({ value: i });
              }
              axis.ticks = ticks;
            },
            min: slice.start - 0.5,
            max: slice.end - 0.5
          },
          y: {
            minWidth: 60,
            maxWidth: 60,
            grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)' },
            ticks: {
              color: isDark ? '#94a3b8' : '#475569',
              font: { family: 'Outfit', size: 11, weight: 600 },
              callback: value => Math.round(value) + '%',
              stepSize: 1,
              precision: 0
            },
            title: {
              display: true,
              text: 'Percentage (%)',
              color: isDark ? '#94a3b8' : '#475569',
              font: { family: 'Outfit', size: 10, weight: 700 }
            }
          }
        }
      },
      plugins: [eventOverlayPlugin]
    };

    const trendChart = new Chart(ctx, config);
    trendChartInstanceRef.current = trendChart;

    // Load initial data limits
    updateTrendChart();

    return () => {
      if (trendChartInstanceRef.current) {
        trendChartInstanceRef.current.destroy();
        trendChartInstanceRef.current = null;
      }
    };
  }, []);

  // Handle data updates after initial trend chart mount
  useEffect(() => {
    updateTrendChart();
  }, [trends, updateTrendChart]);


  // --- CHART 2: DRIVERS DOUGHNUT CHART ---
  const updateDriversChart = useCallback(() => {
    const chart = driversChartInstanceRef.current;
    if (!chart) return;

    const isDark = darkModeRef.current;

    const labels = [];
    const values = [];
    const colors = [];
    let sumSelected = 0;

    ALL_DRIVERS_KEYS.forEach(key => {
      if (drivers[key] !== undefined) {
        labels.push(DRIVER_METADATA[key].label);
        const isEnabled = enabledDrivers.includes(key);
        const val = isEnabled ? drivers[key] : 0;
        values.push(val);
        colors.push(DRIVER_METADATA[key].color);
        if (isEnabled) {
          sumSelected += drivers[key];
        }
      }
    });

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = colors;
    const tracker = document.getElementById("theme-transition-tracker");
    let chartBorderColor = isDark ? '#07080d' : '#ffffff';
    if (tracker) {
      chartBorderColor = window.getComputedStyle(tracker).backgroundColor;
    }
    chart.data.datasets[0].borderColor = chartBorderColor;

    chart.options.plugins.tooltip.backgroundColor = isDark ? '#12131a' : '#ffffff';
    chart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
    chart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
    chart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    chart.update();
  }, [drivers, enabledDrivers]);

  // --- THEME SYNC ---
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem("darkMode", darkMode.toString());
    
    // Update chart configs dynamically over the transition period (320ms)
    // so canvas drawings (event badges & doughnut borders) update smoothly in sync with CSS transitions
    const duration = 320;
    const startTime = performance.now();
    let animId;
    
    const animateThemeTransition = () => {
      const elapsed = performance.now() - startTime;
      updateTrendChart();
      updateDriversChart();
      if (elapsed < duration) {
        animId = requestAnimationFrame(animateThemeTransition);
      }
    };
    
    animateThemeTransition();
    
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [darkMode, updateTrendChart, updateDriversChart]);

  useEffect(() => {
    if (!driversChartCanvasRef.current) return;

    const ctx = driversChartCanvasRef.current.getContext('2d');
    const isDark = darkModeRef.current;

    const centerTextPlugin = {
      id: 'centerText',
      beforeDraw: (chart) => {
        const { width, height, ctx: canvasCtx } = chart;
        canvasCtx.restore();
        
        const isDarkCurrent = darkModeRef.current;
        const sum = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        
        canvasCtx.font = "bold 20px Outfit";
        canvasCtx.textBaseline = "middle";
        canvasCtx.fillStyle = isDarkCurrent ? "#f8fafc" : "#0f172a";
        const valText = sum + "h";
        const valX = Math.round((width - canvasCtx.measureText(valText).width) / 2);
        
        canvasCtx.font = "600 9px Outfit";
        canvasCtx.fillStyle = isDarkCurrent ? "#64748b" : "#475569";
        const lblText = "TOTAL OVERTIME";
        const lblX = Math.round((width - canvasCtx.measureText(lblText).width) / 2);
        
        canvasCtx.fillText(valText, valX, (height / 2) - 5);
        canvasCtx.fillText(lblText, lblX, (height / 2) + 14);
        canvasCtx.save();
      }
    };

    const config = {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderWidth: 2,
          borderColor: isDark ? '#07080d' : '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        onClick: (e, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const index = activeElements[0].index;
            const chart = driversChartInstanceRef.current;
            if (chart && chart.data && chart.data.labels) {
              const label = chart.data.labels[index];
              if (label && onAskAgentRef.current) {
                onAskAgentRef.current(`Explain the impact of ${label.toLowerCase()}.`);
              }
            }
          }
        },
        onHover: (event, activeElements) => {
          if (event && event.native && event.native.target) {
            event.native.target.style.cursor = (activeElements && activeElements.length > 0) ? 'pointer' : 'default';
          }
        },
        animation: { duration: 300, easing: 'easeOutCubic' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#12131a' : '#ffffff',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            cornerRadius: 5,
            callbacks: {
              label: function(context) {
                let val = context.raw || 0;
                const chart = driversChartInstanceRef.current;
                let total = (chart && chart.data && chart.data.datasets[0]) ? chart.data.datasets[0].data.reduce((a, b) => a + b, 0) : 0;
                let pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val}h (${pct}%)`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    };

    const driversChart = new Chart(ctx, config);
    driversChartInstanceRef.current = driversChart;

    updateDriversChart();

    return () => {
      if (driversChartInstanceRef.current) {
        driversChartInstanceRef.current.destroy();
        driversChartInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    updateDriversChart();
  }, [drivers, enabledDrivers, updateDriversChart]);


  // --- CHAT INTERACTION CORE ---
  const triggerAgentResponse = useCallback(async (text) => {
    setIsThinking(true);
    setThinkingStatusText("Analyzing database records...");

    // Append standard user chat bubble
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage = { sender: "user", text, time: userTimestamp };
    
    setChatMessages(prev => [...prev, userMessage]);
    scrollToBottom();

    // Fetch matching categorized payload from FastAPI
    let responseData;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, year, timeframe })
      });
      if (response.ok) {
        responseData = await response.json();
      } else {
        throw new Error("Chat fetch failed");
      }
    } catch (err) {
      console.error(err);
      responseData = {
        thought: "[query] Error fetching query from backend.\n[fallback] Reverting to local fallback core.",
        content: "I'm having trouble connecting to my central reasoning model. Our YTD 2026 data contains **24 entries** and **1,642 hours** of overtime. Feel free to try again in a few moments."
      };
    }

    // Instantiate temporary placeholder for typing/loading indicator (three dots)
    const agentTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const placeholderMessage = {
      sender: "agent",
      text: "",
      time: agentTimestamp,
      isPlaceholder: true
    };

    setChatMessages(prev => [...prev, placeholderMessage]);
    scrollToBottom();

    // Show three loading dots briefly, then resolve with the chatbot's message
    setTimeout(() => {
      setIsThinking(false);
      setChatMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.isPlaceholder) {
          last.text = responseData.content;
          last.isPlaceholder = false;
        }
        return updated;
      });
      scrollToBottom();
    }, 800);

  }, [year, timeframe]);

  // Load welcome agent greeting on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chatHistory");
      if (saved && JSON.parse(saved).length > 0) {
        return;
      }
    } catch (e) {
      console.error("Error reading chatHistory on mount:", e);
    }

    const greetingTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Format YTD/Year tags on initial load
    const welcomeText = `### Welcome to the Overtime Analysis Agent! 👋

I have ingested all operational logs, job vacancy posts, and IT/event schedules. Here is a high-level audit of the top departments for **{TIMEFRAME} {YEAR}**:

| Department | Total OT Hours | Est. Cost | Key Core Driver |
| :--- | :---: | :---: | :--- |
| **Operations Strategic Initiative** | 361 hrs | $21,623 | Staff Vacancies |
| **Central Operations, Transit Service** | 359 hrs | $21,568 | Staff Vacancies |
| **Exec. Office, Admin & Development** | 353 hrs | $21,188 | System Downtime |
| **Bus Division Maintenance** | 343 hrs | $20,593 | System Downtime |

*Notice the severe **Operations Strategic Initiative staff shortage** and the **Bus Division Maintenance outage peak**.* 

How can I help you analyze these spikes today? Feel free to click any of the **suggested questions below** or type your own!`;

    const initialGreeting = {
      sender: "agent",
      text: welcomeText.replace("{TIMEFRAME}", getTimeframeLabel(timeframe, year)).replace("{YEAR}", year.toString()),
      thought: `[init] Initializing Overtime AI Core...\n[data] Loading {TIMEFRAME} {YEAR} datasets (100 log entries, 45 corporate events, 30 department profiles)\n[match] Indexing correlations between 'job_vacancies' and 'ot_hours'\n[success] Models calibrated. Ready to serve.`.replace("{TIMEFRAME}", getTimeframeLabel(timeframe, year)).replace("{YEAR}", year.toString()),
      time: greetingTimestamp,
      isPlaceholder: false
    };

    setChatMessages([initialGreeting]);
  }, []);

  // Serialize chat messages (filtering out typing placeholders) to localStorage
  useEffect(() => {
    try {
      const messagesToSave = chatMessages.filter(msg => !msg.isPlaceholder);
      if (messagesToSave.length > 0) {
        localStorage.setItem("chatHistory", JSON.stringify(messagesToSave));
      }
    } catch (e) {
      console.error("Error saving chat history to localStorage:", e);
    }
  }, [chatMessages]);

  // Expose local trigger to global overlay clicks
  useEffect(() => {
    onAskAgentRef.current = (msg) => {
      triggerAgentResponse(msg);
    };
  }, [triggerAgentResponse]);

  // Scroll chat messages list to absolute bottom with smooth behavior
  const scrollToBottom = () => {
    isAutoScrollingRef.current = true;
    setShowScrollButton(false);

    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    autoScrollTimeoutRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 2000); // Generous safety fallback timeout for extremely long smooth scrolls

    setTimeout(() => {
      if (chatMessagesContainerRef.current) {
        chatMessagesContainerRef.current.scrollTo({
          top: chatMessagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleChatScroll = () => {
    if (chatMessagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesContainerRef.current;
      
      // If we are currently auto-scrolling, or if we are close to the bottom, hide the scroll button
      if (isAutoScrollingRef.current || (scrollHeight - scrollTop - clientHeight <= 100)) {
        setShowScrollButton(false);
        // Safely clear auto-scroll once we have successfully reached the bottom area
        if (scrollHeight - scrollTop - clientHeight <= 15) {
          isAutoScrollingRef.current = false;
        }
      } else {
        setShowScrollButton(true);
      }
    }
  };

  const handleSendMessage = () => {
    if (chatInputText.trim().length === 0) return;
    triggerAgentResponse(chatInputText);
    setChatInputText("");
  };

  const handleClearChatHistory = () => {
    const greetingTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const welcomeText = `### Welcome to the Overtime Analysis Agent! 👋

I have ingested all operational logs, job vacancy posts, and IT/event schedules. Here is a high-level audit of the top departments for **{TIMEFRAME} {YEAR}**:

| Department | Total OT Hours | Est. Cost | Key Core Driver |
| :--- | :---: | :---: | :--- |
| **Operations Strategic Initiative** | 361 hrs | $21,623 | Staff Vacancies |
| **Central Operations, Transit Service** | 359 hrs | $21,568 | Staff Vacancies |
| **Exec. Office, Admin & Development** | 353 hrs | $21,188 | System Downtime |
| **Bus Division Maintenance** | 343 hrs | $20,593 | System Downtime |

*Notice the severe **Operations Strategic Initiative staff shortage** and the **Bus Division Maintenance outage peak**.* 

How can I help you analyze these spikes today? Feel free to click any of the **suggested questions below** or type your own!`;

    const initialGreeting = {
      sender: "agent",
      text: welcomeText.replace("{TIMEFRAME}", getTimeframeLabel(timeframe, year)).replace("{YEAR}", year.toString()),
      thought: `[init] Initializing Overtime AI Core...\n[data] Loading {TIMEFRAME} {YEAR} datasets (100 log entries, 45 corporate events, 30 department profiles)\n[match] Indexing correlations between 'job_vacancies' and 'ot_hours'\n[success] Models calibrated. Ready to serve.`.replace("{TIMEFRAME}", getTimeframeLabel(timeframe, year)).replace("{YEAR}", year.toString()),
      time: greetingTimestamp,
      isPlaceholder: false
    };
    setChatMessages([initialGreeting]);
    try {
      localStorage.setItem("chatHistory", JSON.stringify([initialGreeting]));
    } catch (e) {
      console.error("Error clearing chat history in localStorage:", e);
    }
  };


  // --- CHIP MOUSEENTER AND LEAVE EVENTS CORRELATION ---
  const handleChipMouseEnter = (ev) => {
    const chart = trendChartInstanceRef.current;
    if (!chart) return;

    const months = chart.data.labels;
    const monthStr = ev.date.substring(0, 3);
    const monthIndex = months.indexOf(monthStr);
    if (monthIndex === -1) return;

    const daysPart = ev.date.substring(4);
    let startDay = 1;
    let endDay = 1;
    if (daysPart.includes("-")) {
      const parts = daysPart.split("-");
      startDay = parseInt(parts[0], 10);
      endDay = parseInt(parts[1], 10);
    } else {
      startDay = parseInt(daysPart, 10);
      endDay = startDay;
    }

    const daysInMonthMap = {
      Jan: 31, Feb: 28, Mar: 31, Apr: 30, May: 31, Jun: 30,
      Jul: 31, Aug: 31, Sep: 30, Oct: 31, Nov: 30, Dec: 31
    };
    const totalDays = daysInMonthMap[monthStr] || 30;

    const startVal = monthIndex - 0.5 + (startDay - 0.5) / totalDays;
    const endVal = monthIndex - 0.5 + (endDay - 0.5) / totalDays;

    const startX = chart.scales.x.getPixelForValue(startVal);
    const endX = chart.scales.x.getPixelForValue(endVal);
    const eventX = startDay === endDay ? startX : (startX + endX) / 2;

    chart.hoveredEvent = ev;
    chart.hoveredEvents = [ev];
    chart.hoveredMousePos = { x: eventX, y: chart.chartArea.top + 70 };
    chart.update('none');
  };

  const handleChipMouseLeave = () => {
    const chart = trendChartInstanceRef.current;
    if (!chart) return;
    chart.hoveredEvent = null;
    chart.hoveredEvents = null;
    chart.hoveredMousePos = null;
    chart.update('none');
  };


  // --- TABLE LOGS EXPORT CSV ---
  const handleExportCSV = () => {
    const headers = ["Department", "Union", "Net Vacancies"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";
    
    vacanciesData.rows.forEach(row => {
      const csvRow = [
        `"${row.department}"`,
        `"${row.union}"`,
        row.vacancies
      ];
      csvContent += csvRow.join(",") + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vacancies_export_${department}_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // --- TABLE COLUMN SORT HELPER ---
  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="sort-icon" style={{ opacity: 0.35, marginLeft: '6px' }} />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="sort-icon active-sort" style={{ color: 'var(--text-accent, #3b82f6)', marginLeft: '6px' }} />
    ) : (
      <ChevronDown className="sort-icon active-sort" style={{ color: 'var(--text-accent, #3b82f6)', marginLeft: '6px' }} />
    );
  };


  // --- RENDER TIMEFRAMES PROGRAMMATIC PILLS ---
  const renderTimeframeSelector = () => {
    let timeframes = [];
    if (year === 2026) {
      timeframes = [
        { range: "q1", label: `Q1 2026` },
        { range: "q2", label: `Q2 2026` },
        { range: "h1", label: `H1 2026` },
        { range: "ytd", label: "YTD" },
        { range: "full", label: "Full Year" }
      ];
    } else if (year === 2025) {
      timeframes = [
        { range: "q3", label: `Q3 2025` },
        { range: "q4", label: `Q4 2025` },
        { range: "h2", label: `H2 2025` },
        { range: "full", label: "Full Year" }
      ];
    } else {
      timeframes = [
        { range: "q1", label: `Q1 ${year}` },
        { range: "q2", label: `Q2 ${year}` },
        { range: "q3", label: `Q3 ${year}` },
        { range: "q4", label: `Q4 ${year}` },
        { range: "h1", label: `H1 ${year}` },
        { range: "h2", label: `H2 ${year}` },
        { range: "full", label: "Full Year" }
      ];
    }

    return (
      <>
        {/* Buttons wrapper for larger viewports */}
        <div className="timeframe-buttons-wrapper">
          {timeframes.map(tf => (
            <button
              key={tf.range}
              className={`tf-btn ${timeframe === tf.range ? 'active' : ''}`}
              onClick={() => {
                setTimeframe(tf.range);
                setCurrentPage(1);
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
        
        {/* Select dropdown wrapper for mobile viewports */}
        <div className="timeframe-dropdown-wrapper">
          <select
            className="timeframe-select-dropdown"
            value={timeframe}
            onChange={(e) => {
              setTimeframe(e.target.value);
              setCurrentPage(1);
            }}
          >
            {timeframes.map(tf => (
              <option key={tf.range} value={tf.range}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  };

  // Prepare and filter active event chips displayed below the chart
  const renderEventChips = () => {
    const slice = getTimeframeSlice(timeframe, year);
    const months = trends.months;

    const activeEvents = eventsList.filter(ev => {
      const monthStr = ev.date.substring(0, 3);
      const monthIndex = months.indexOf(monthStr);
      return monthIndex >= slice.start && monthIndex < slice.end;
    });

    // Chronological sorting
    const monthOrder = { "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12 };
    activeEvents.sort((a, b) => {
      const monthA = monthOrder[a.date.substring(0, 3)] || 0;
      const monthB = monthOrder[b.date.substring(0, 3)] || 0;
      if (monthA !== monthB) return monthA - monthB;
      const dayA = parseInt(a.date.substring(4), 10) || 0;
      const dayB = parseInt(b.date.substring(4), 10) || 0;
      return dayA - dayB;
    });

    if (activeEvents.length === 0) return null;

    return (
      <div 
        className={`active-events-list-container ${!showEvents ? 'collapsed' : ''}`}
        style={{ display: 'flex' }}
      >
        <span className="active-events-title">Active Events in Selected Period (Hover to Locate):</span>
        {activeEvents.map((ev, index) => (
          <button
            key={index}
            className={`active-event-chip event-${ev.type} ${ev.upcoming ? 'upcoming-event' : ''}`}
            onMouseEnter={() => handleChipMouseEnter(ev)}
            onMouseLeave={handleChipMouseLeave}
            onClick={() => triggerAgentResponse(`Explain the impact of the "${ev.name}" event in ${ev.date.substring(0, 3)} ${year}.`)}
          >
            <span className="event-chip-dot"></span>
            <span>{ev.name} ({ev.date})</span>
            {ev.upcoming && <span className="upcoming-badge">Upcoming</span>}
          </button>
        ))}
      </div>
    );
  };


  // Calculate relative percentages for driver doughnut checkboxes dynamically
  let sumSelectedDrivers = 0;
  ALL_DRIVERS_KEYS.forEach(key => {
    if (enabledDrivers.includes(key) && drivers[key] !== undefined) {
      sumSelectedDrivers += drivers[key];
    }
  });


  // --- RENDER RETAINING ORIGINAL COMPONENT LAYOUT ---
  const renderChatContainer = () => {
    return (
      <section className="right-panel chat-container glass-panel">
        {/* CHAT HEADER */}
        <div className="chat-header">
          <div className="agent-profile">
            <div className="agent-avatar-wrapper">
              <div className="agent-avatar">
                <Bot className="agent-bot-icon" />
              </div>
            </div>
            <div className="agent-info-text">
              <h3>Chat with our AI Agent</h3>
            </div>
          </div>
          
          <button 
            className="chat-menu-btn" 
            title="Clear Chat History"
            onClick={handleClearChatHistory}
          >
            <Trash2 className="icon-sm" />
          </button>
        </div>

        {/* CHAT LOG SCREEN */}
        <div className="chat-messages-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="chat-messages" ref={chatMessagesContainerRef} onScroll={handleChatScroll}>
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-bubble-container ${msg.sender}`}>
                <div className="chat-bubble">
                  {msg.isPlaceholder ? (
                    <div className="bubble-typing-indicator">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }} />
                  )}
                </div>
                <span className="chat-time">{msg.time}</span>
              </div>
            ))}
          </div>
          {showScrollButton && (
            <button 
              className="chat-scroll-bottom-btn" 
              onClick={() => {
                scrollToBottom();
                setShowScrollButton(false);
              }}
              title="Scroll to bottom"
            >
              <ChevronDown className="icon-sm" style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>

        {/* SUGGESTED QUERY CHIPS */}
        <div className="suggested-queries-area">
          <span className="suggestions-title">Ask about the data:</span>
          <div className="query-chips-wrapper">
            <button 
              className="query-chip"
              onClick={() => triggerAgentResponse("Explain the massive overtime hours spike in April.")}
            >
              <span className="chip-emoji">🔍</span> Explain April OT Spike
            </button>
            <button 
              className="query-chip"
              onClick={() => triggerAgentResponse("How do open vacancies in Operations Strategic Initiative correlate with our overtime spend?")}
            >
              <span className="chip-emoji">📈</span> Vacancy vs OT correlation
            </button>
            <button 
              className="query-chip"
              onClick={() => triggerAgentResponse("Did the System Migration in May cause Bus Division Maintenance overtime?")}
            >
              <span className="chip-emoji">⚡</span> IT Outage Impact
            </button>
            <button 
              className="query-chip"
              onClick={() => triggerAgentResponse("What proactive hiring strategy do you recommend to reduce overtime?")}
            >
              <span className="chip-emoji">💡</span> Hiring Recommendations
            </button>
          </div>
        </div>

        {/* INPUT FORM BAR */}
        <div className="chat-input-container">
          <textarea 
            id="chat-input"
            placeholder="Ask a question about the overtime data..." 
            rows={1}
            value={chatInputText}
            onChange={(e) => {
              setChatInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <div className="chat-input-toolbar">
            <button 
              className="send-btn" 
              onClick={handleSendMessage}
              disabled={chatInputText.trim().length === 0}
            >
              <Send className="icon-sm" />
            </button>
          </div>
        </div>
      </section>
    );
  };

  // Dynamic card scaling based on ResizeObserver width
  const metricCardStyle = {
    height: 'auto', // Keep natural height to be as compact as possible if text is short
    maxHeight: `${metricCardWidth}px`, // Strictly cap height at a perfect square
    padding: metricCardWidth < 180 ? '12px 14px' : '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between'
  };
  
  const getValueFontSize = (val, cardWidth) => {
    const valStr = String(val || "");
    const len = valStr.length || 1;
    const padding = cardWidth < 180 ? 28 : 40;
    const availWidth = cardWidth - padding;
    
    // Scan down from premium 24px font size down to 11px to find the largest size that fits
    for (let S = 24; S >= 11; S--) {
      // Estimate horizontal text width and text wrapping lines
      const textWidth = len * S * 0.52;
      const lines = Math.ceil(textWidth / availWidth);
      
      // Calculate projected natural height of the card content
      const paddingHeight = cardWidth < 180 ? 24 : 32;
      const otherContentHeight = 32 + 8 + 14 + 2; // Icon bg, icon margins, label size, margins
      const valueHeight = lines * S * 1.25; // Factoring line-height
      const projectedHeight = paddingHeight + otherContentHeight + valueHeight;
      
      // If the projected natural height fits nicely within the square limit, or we are at minimum
      if (projectedHeight <= cardWidth || S === 11) {
        return `${S}px`;
      }
    }
    return '11px';
  };

  const metricLabelStyle = {
    fontSize: '11px'
  };
  const trendBadgeStyle = {
    fontSize: '11px'
  };
  const iconBgStyle = {
    width: '32px',
    height: '32px'
  };
  const iconStyle = {
    width: '16px',
    height: '16px'
  };
  const chevronSize = 14;

  return (
    <div className="app-container">
      {/* HEADER BAR */}
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon-wrapper">
            <img 
              src="https://cdn.beta.metro.net/wp-content/uploads/2021/04/04233038/cropped-metro-logo-512x512-1-192x192.png" 
              className="logo-icon" 
              alt="Metro Logo" 
            />
            <div className="logo-pulse"></div>
          </div>
          <div className="logo-text">
            <h1>Overtime Analysis Agent</h1>
          </div>
        </div>
        
        <div className="header-controls">
          <div className="year-selector">
            <select 
              id="year-select" 
              className="year-select"
              value={year}
              onChange={(e) => {
                const yr = parseInt(e.target.value, 10);
                setYear(yr);
                setCurrentPage(1);
                // Adjust timeframe safety limits
                if (yr === 2026) {
                  if (["q3", "q4", "h2"].includes(timeframe)) {
                    setTimeframe("ytd");
                  }
                } else if (yr === 2025) {
                  if (["q1", "q2", "h1", "ytd"].includes(timeframe)) {
                    setTimeframe("h2");
                  }
                }
              }}
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <div className="timeframe-selector">
            {renderTimeframeSelector()}
          </div>
          
          <button 
            className={`action-btn header-sync ${syncStatus === "Error" ? "sync-error" : ""}`} 
            title="Sync Live Data"
            onClick={handleSyncData}
            disabled={syncStatus !== "Sync"}
          >
            {syncStatus === "Error" ? (
              <X className="icon-sm" />
            ) : (
              <RefreshCw 
                className="icon-sm" 
                style={{ animation: isSyncSpinning ? "spin 1s infinite linear" : "" }}
              />
            )}
            <span>{syncStatus}</span>
          </button>

          <button 
            className="action-btn header-theme-toggle" 
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="icon-sm" /> : <Moon className="icon-sm" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT BODY */}
      <main className="main-layout">
        
        {/* LEFT PANEL: VISUALIZATIONS AND TABLE */}
        <section className="left-panel dashboard-container">
          
          {/* KPI INFO CARDS GRID */}
          <div className="metrics-grid" ref={metricsGridRef}>
            <div className="metric-card glass-panel" id="kpi-hours" style={metricCardStyle}>
              <div className="card-icon-header">
                <span className="card-icon-bg violet" style={iconBgStyle}><Clock className="metric-icon" style={iconStyle} /></span>
                <span className="trend-badge positive" style={trendBadgeStyle}>
                  <ChevronDown size={chevronSize} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }} /> -12.4%
                </span>
              </div>
              <div className="metric-info">
                <span className="metric-label" style={metricLabelStyle}>Total Overtime Hours</span>
                <h3 className="metric-value" style={{ fontSize: getValueFontSize(metrics.totalHours.toLocaleString() + 'h', metricCardWidth) }}>{metrics.totalHours.toLocaleString()}h</h3>
              </div>
              <div className="card-glow-bg"></div>
            </div>

            <div className="metric-card glass-panel" id="kpi-vacancies" style={metricCardStyle}>
              <div className="card-icon-header">
                <span className="card-icon-bg cyan" style={iconBgStyle}><Briefcase className="metric-icon" style={iconStyle} /></span>
                <span className="trend-badge negative" style={trendBadgeStyle}>
                  <ChevronDown size={chevronSize} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px', transform: 'rotate(180deg)' }} /> +18.2%
                </span>
              </div>
              <div className="metric-info">
                <span className="metric-label" style={metricLabelStyle}>Job Vacancies (Avg)</span>
                <h3 className="metric-value" style={{ fontSize: getValueFontSize(metrics.avgVacancies, metricCardWidth) }}>{metrics.avgVacancies}</h3>
              </div>
              <div className="card-glow-bg"></div>
            </div>

            <div className="metric-card glass-panel" id="kpi-cost" style={metricCardStyle}>
              <div className="card-icon-header">
                <span className="card-icon-bg emerald" style={iconBgStyle}><DollarSign className="metric-icon" style={iconStyle} /></span>
                <span className="trend-badge positive" style={trendBadgeStyle}>
                  <ChevronDown size={chevronSize} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }} /> -$14,200
                </span>
              </div>
              <div className="metric-info">
                <span className="metric-label" style={metricLabelStyle}>Estimated OT Cost</span>
                <h3 className="metric-value" style={{ fontSize: getValueFontSize('$' + metrics.totalCost.toLocaleString(), metricCardWidth) }}>${metrics.totalCost.toLocaleString()}</h3>
              </div>
              <div className="card-glow-bg"></div>
            </div>

            <div className="metric-card glass-panel" id="kpi-driver" style={metricCardStyle}>
              <div className="card-icon-header">
                <span className="card-icon-bg rose" style={iconBgStyle}><AlertTriangle className="metric-icon" style={iconStyle} /></span>
                <span className="driver-tag alert" style={trendBadgeStyle}>High Impact</span>
              </div>
              <div className="metric-info">
                <span className="metric-label" style={metricLabelStyle}>Primary Driver</span>
                <h3 className="metric-value text-glow-rose" style={{ fontSize: getValueFontSize(metrics.primaryDriver, metricCardWidth) }}>{metrics.primaryDriver}</h3>
              </div>
              <div className="card-glow-bg"></div>
            </div>
          </div>

          {/* DYNAMIC CHAT PANEL NESTED IN MOBILE VIEW */}
          {isMobileLayout && renderChatContainer()}

          {/* MAIN LINE CHART COMPONENT */}
          <div className="chart-section-card glass-panel">
            <div className="section-card-header">
              <div className="card-title-group">
                <LineChartIcon className="section-icon text-cyan" />
                <div>
                  <h2>Overtime & Vacancy Trends (%)</h2>
                  <p className="card-subtitle">Correlation of staff shortages, overtime workload, and budget impact</p>
                </div>
              </div>
              
              {/* FILTERS PANEL CO-LOCATED WITH GRAPH */}
              <div className="inline-filter-panel">
                <div className="filter-row-top">
                  <div className="filter-group">
                    <label htmlFor="dept-select">Department:</label>
                    <select 
                      id="dept-select" 
                      className="custom-select"
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Departments</option>
                      {DEPARTMENTS_LIST.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label htmlFor="union-select">Union:</label>
                    <select 
                      id="union-select" 
                      className="custom-select"
                      value={union}
                      onChange={(e) => {
                        setUnion(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Unions</option>
                      <option value="NC">NC</option>
                      <option value="TEAMS">TEAMS</option>
                      <option value="AFSCME">AFSCME</option>
                      <option value="ATU">ATU</option>
                      <option value="TCU">TCU</option>
                      <option value="UTU">UTU</option>
                    </select>
                  </div>
                  
                  {year === 2026 && (
                    <label className="checkbox-wrapper" id="wrapper-toggle-predictions">
                      <input 
                        type="checkbox" 
                        id="toggle-predictions" 
                        checked={showPredictions}
                        onChange={(e) => setShowPredictions(e.target.checked)}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text text-violet">Show Predictions</span>
                    </label>
                  )}
                </div>
                
                <div className="filter-row-bottom">
                  <div className="checkbox-filters">
                    <label className="checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        id="toggle-vacancies" 
                        checked={showVacancies}
                        onChange={(e) => setShowVacancies(e.target.checked)}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text">Vacancy Rate (%)</span>
                    </label>
                    <label className="checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        id="toggle-ot-hours" 
                        checked={showOtHours}
                        onChange={(e) => setShowOtHours(e.target.checked)}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text">Overtime Hours (%)</span>
                    </label>
                    <label className="checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        id="toggle-trendline" 
                        checked={showPay}
                        onChange={(e) => setShowPay(e.target.checked)}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text">Overtime Pay (%)</span>
                    </label>
                    <label className="checkbox-wrapper">
                      <input 
                        type="checkbox" 
                        id="toggle-events-overlay" 
                        checked={showEvents}
                        onChange={(e) => setShowEvents(e.target.checked)}
                      />
                      <span className="custom-checkbox"></span>
                      <span className="checkbox-text text-rose">Show Events</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="chart-canvas-wrapper">
              <canvas ref={trendChartCanvasRef} id="trendChart"></canvas>
            </div>
            
            {/* EVENT INTERACTIVE HOVER LABELS CHIPS */}
            {renderEventChips()}
          </div>

          {/* TWO COLUMN ROOT CAUSES DOUGHNUT CHART */}
          <div className="charts-two-col">
            <div className="chart-section-card glass-panel">
              <div className="section-card-header">
                <div className="card-title-group">
                  <PieChartIcon className="section-icon text-violet" />
                  <div>
                    <h2>Overtime Cost Drivers</h2>
                    <p className="card-subtitle">Root causes triggering overtime hours</p>
                  </div>
                </div>
              </div>
              
              <div className="chart-two-col-layout">
                <div className="chart-canvas-wrapper-sm">
                  <canvas ref={driversChartCanvasRef} id="driversChart"></canvas>
                </div>
                
                {/* CHECKBOX SELECTION DIRECTLY INTEGRATED NEAR DOUGHNUT */}
                <div className="chart-sidebar-filters">
                  <span className="filter-sidebar-title">Include Drivers:</span>
                  <div className="checkbox-filters-vertical">
                    {ALL_DRIVERS_KEYS.map(key => {
                      const isEnabled = enabledDrivers.includes(key);
                      const baseName = DRIVER_METADATA[key].label;
                      const rawVal = drivers[key] || 0;
                      const pct = sumSelectedDrivers > 0 && isEnabled ? Math.round((rawVal / sumSelectedDrivers) * 100) : 0;
                      const labelText = isEnabled ? `${baseName} (${pct}%)` : baseName;

                      const classMap = {
                        understaffing: 'violet',
                        outages: 'cyan',
                        seasonality: 'rose',
                        backlog: 'warning',
                        others: 'muted'
                      };
                      const suffix = classMap[key] || key;

                      return (
                        <label 
                          key={key} 
                          className={`checkbox-wrapper filter-chip driver-${suffix}`}
                        >
                          <input 
                            type="checkbox" 
                            className="driver-checkbox" 
                            value={key} 
                            checked={isEnabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEnabledDrivers(prev => [...prev, key]);
                              } else {
                                setEnabledDrivers(prev => prev.filter(item => item !== key));
                              }
                            }}
                          />
                          <span className="custom-checkbox"></span>
                          <span className="checkbox-text">{labelText}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DETAILED DATA TABLE */}
          <div ref={tableSectionRef} className="data-table-section glass-panel">
            <div className="table-header">
              <div className="table-title-group">
                <Database className="section-icon text-emerald" />
                <div>
                  <h2>Department & Union Net Vacancies</h2>
                  <p className="card-subtitle">Combinations of departments, unions, and their respective vacancy figures</p>
                </div>
              </div>
              <div className="table-actions">
                <div className="table-search">
                  <Search className="search-icon" />
                  <input 
                    type="text" 
                    id="table-search-input"
                    placeholder="Search department, union..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="action-btn table-export" onClick={handleExportCSV}>
                  <Download className="icon-sm" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
            
            <div className="table-wrapper">
              <table className="dashboard-table" id="ot-logs-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleSortClick("department")} style={{ width: '50%', cursor: 'pointer' }}>
                      Department {renderSortIcon("department")}
                    </th>
                    <th onClick={() => handleSortClick("union")} style={{ width: '14%', cursor: 'pointer' }}>
                      Union {renderSortIcon("union")}
                    </th>
                    <th onClick={() => handleSortClick("vacancies")} className="num-align" style={{ width: '18%', cursor: 'pointer' }}>
                      Net Vacancies {renderSortIcon("vacancies")}
                    </th>
                    <th onClick={() => handleSortClick("vacancy_pct")} className="num-align" style={{ width: '18%', cursor: 'pointer' }}>
                      Vacancy % {renderSortIcon("vacancy_pct")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vacanciesData.rows.map((row, index) => {
                    return (
                      <tr key={index}>
                        <td><span className="td-dept">{row.department}</span></td>
                        <td><span className="td-union" style={{ fontWeight: 600, opacity: 0.85 }}>{row.union}</span></td>
                        <td className="num-align"><span className="td-hours">{Math.round(row.vacancies)}</span></td>
                        <td className="num-align">
                          <span className="td-hours" style={{ 
                            color: row.vacancy_pct > 15 ? 'var(--text-rose)' : row.vacancy_pct > 5 ? 'var(--text-amber)' : 'inherit',
                            fontWeight: row.vacancy_pct > 5 ? '600' : 'normal'
                          }}>
                            {row.vacancy_pct !== undefined ? `${row.vacancy_pct}%` : '0%'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span className="showing-text">
                  Showing {vacanciesData.totalCount > 0 ? vacanciesData.startIndex + 1 : 0}-{vacanciesData.endIndex} of {vacanciesData.totalCount} records
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Show:</span>
                  <select 
                    value={rowsPerPage} 
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                      scrollToTable();
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '4px 8px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value={10} style={{ background: 'var(--bg-table-wrapper, #1a1a1a)' }}>10 rows</option>
                    <option value={25} style={{ background: 'var(--bg-table-wrapper, #1a1a1a)' }}>25 rows</option>
                    <option value={50} style={{ background: 'var(--bg-table-wrapper, #1a1a1a)' }}>50 rows</option>
                  </select>
                </div>
              </div>
              
              <div className="pagination-controls">
                <button 
                  className="pag-btn" 
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    scrollToTable();
                  }}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft />
                </button>
                <span className="page-num-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Page 
                  <input 
                    type="number"
                    min={1}
                    max={vacanciesData.totalPages || 1}
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    onKeyDown={handlePageInputKeyDown}
                    style={{
                      width: '45px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '2px 4px',
                      fontSize: '11px',
                      textAlign: 'center',
                      outline: 'none',
                    }}
                  />
                  of {vacanciesData.totalPages}
                </span>
                <button 
                  className="pag-btn" 
                  onClick={() => {
                    setCurrentPage(prev => Math.min(vacanciesData.totalPages, prev + 1));
                    scrollToTable();
                  }}
                  disabled={currentPage === vacanciesData.totalPages}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>

        </section>

        {/* RIGHT PANEL: CHAT INTERACTIVE WINDOW (FLOATING SIDEBAR IN DESKTOP VIEW) */}
        {!isMobileLayout && renderChatContainer()}

      </main>

      {/* Theme Transition Color Tracker (used in original styling) */}
      <div id="theme-transition-tracker" className="hidden-tracker"></div>
    </div>
  );
}
