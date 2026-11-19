"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import {
  FileText,
  Download,
  Image as ImageIcon,
  Copy,
  Check,
  Sparkles,
  Save,
  Trash2,
  Upload,
  Search,
  FolderOpen,
  ChevronDown,
  X,
  Plus,
  RotateCcw,
  Cloud,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import TopNavHeader from "../../components/TopNavHeader";
import { supabase, uploadPhotoToSupabase } from "../../lib/supabase";

interface SupervisorOption {
  id: string;
  name: string;
  title: string;
  signatureUrl: string;
}

interface DivisionOption {
  id: string;
  zh: string;
}

interface MeasurementRow {
  parameter: string;
  result: string;
  standard: string;
  evaluation: string;
}

interface CapaRow {
  action: string;
  pic: string;
  targetDate: string;
  status: string;
}

interface SignOffInfo {
  signatureId: string;
  name: string;
  position: string;
  date: string;
}

interface InvestigationRecord {
  id: string;
  reportNo: string;
  dateTime: string;
  incidentLocation: string;
  relatedDepartment: string;
  investigationTeam: string;
  reportStatus: string;
  chronology: string;
  hasMeasurements: boolean;
  measurements: MeasurementRow[];
  rootCause: string;
  sourcePhotos: string[];
  sourceCaption: string;
  impactedPhotos: string[];
  impactedCaption: string;
  postActionPhotos: string[];
  postActionCaption: string;
  capaRows: CapaRow[];
  preparedBy: SignOffInfo;
  checkedBy: SignOffInfo;
  approvedBy: SignOffInfo;
  createdAt: string;
}

interface PageSlice {
  pageNumber: number;
  chronologyLines: string[];
  showChronologyHeader: boolean;
  chronologyContinued: boolean;
  showMeasurements: boolean;
  rootCauseLines: string[];
  showRootCauseHeader: boolean;
  rootCauseContinued: boolean;
  showSection2Banner: boolean;
  showVisualSection: boolean;
  showCapaSection: boolean;
  showApprovalSection: boolean;
}

const DOC_CODE = "QMB-FRM-ENV-TIL-003";
const FIXED_REV_NO = "00";
const FIXED_ISSUE_DATE = "2026.09.15";

const ALL_SIGNERS: SupervisorOption[] = [
  {
    id: "sukardi-syam",
    name: "SUKARDI SYAM 卡尔迪",
    title: "Foreman / 班长",
    signatureUrl: "/signatures/sukardi.syam.png",
  },
  {
    id: "akbar-sudarmo",
    name: "AKBAR SUDARMO 阿克巴",
    title: "SPV / 主管",
    signatureUrl: "/signatures/akbar.sudarmo.png",
  },
  {
    id: "chen-xiaoxu",
    name: "CHEN XIAOXU / 陈晓旭",
    title: "Manajer / 经理",
    signatureUrl: "/signatures/chen.xiaoxu.png",
  },
  {
    id: "bian-yuandong",
    name: "BIAN YUANDONG / 卞远东",
    title: "Wakil Direktur / 副总经理",
    signatureUrl: "/signatures/bian.yuandong.png",
  },
  {
    id: "rao-youqing",
    name: "RAO YOUQING / 饶友清",
    title: "Direktur / 总经理",
    signatureUrl: "/signatures/rao.youqing.png",
  },
];

const PREPARED_BY_OPTIONS = ALL_SIGNERS;
const REVIEW_APPROVE_OPTIONS = ALL_SIGNERS.filter(
  (s) => s.id !== "sukardi-syam"
);

const INSPECTOR_CHIPS = ["陈晓旭", "卡尔迪"];

const STATUS_OPTIONS = [
  "Investigasi Awal / 初步调查",
  "Proses Perbaikan / 整改中",
  "Verifikasi Lapangan / 现场复查",
  "Selesai (Closed) / 已关闭",
];

const DIVISION_LIST: DivisionOption[] = [
  { id: "DIVISI PEMROSESAN MATERIAL", zh: "材料后处理车间" },
  { id: "DIVISI KRISTALISASI", zh: "结晶车间" },
  { id: "DIVISI AIR LIMBAH TERNARY", zh: "三元废水车间" },
  { id: "DIVISI PRODUKSI PREKURSOR", zh: "前驱体制造车间" },
  { id: "DIVISI PRODUKSI NICKEL HIDROKSIDA", zh: "羟基镍制造车间" },
  { id: "DIVISI PENJADWALAN 3", zh: "调度三车间" },
  {
    id: "TIM BAHAN BAKU,BAHAN PENUNJANG,DAN PRODUK JADI",
    zh: "原辅料与成品组",
  },
  { id: "DIVISI PROSESING MINERAL (500MU)", zh: "选矿车间(500亩)" },
  { id: "DIVISI BOILER KOOGENERASI", zh: "热电联产（锅炉车间）" },
  { id: "DIVISI PELEBURAN SULFUR", zh: "熔硫车间" },
  { id: "DIVISI PEMBUATAN ASAM 2", zh: "制酸二车间" },
  { id: "DIVISI PEMBUATAN ASAM 3", zh: "制酸三车间" },
  { id: "DIVISI FILTER PRESS (500MU)", zh: "500亩压滤车间" },
  { id: "DIVISI PASCA PROSES ESG", zh: "ESG后处理车间" },
  { id: "DIVISI PASCA PROSES 2", zh: "后处理二车间" },
  { id: "DIVISI PASCA PROSES 1", zh: "后处理一车间" },
  { id: "DIVISI PEMBUATAN ASAM 1", zh: "制酸一车间" },
  { id: "DIVISI PENGOLAHAN TAILING", zh: "尾渣处置车间" },
  { id: "DIVISI NICKEL ELEKTROLITIK", zh: "电积镍车间" },
  { id: "DIVISI PELARUTAN/PELEBURAN", zh: "溶解车间" },
  { id: "DIVISI AIR LIMBAH EKTRASI DAN MHP", zh: "萃取及MHP废水车间" },
  { id: "DIVISI PEMURNIAN", zh: "提纯车间" },
  { id: "TIM KERJA ANALISIS", zh: "分析工作组" },
  { id: "TIM PENGAMBILAN SAMPLE/PERSIAPAN SAMPLE", zh: "取制样组" },
  { id: "TIM PUSAT UJI COBA MENENGAH", zh: "中试中心组" },
  { id: "DIVISI HPAL", zh: "高压车间" },
  { id: "DIVISI ESG-HPAL", zh: "ESG-HPAL车间" },
  { id: "DIVISI UTILITAS", zh: "公辅车间" },
  { id: "DIVISI PROSESING MINERAL", zh: "选矿车间" },
  { id: "PENGADUK ASPAL (BATCHING PLANT)", zh: "搅拌站 沥青站" },
  { id: "DIVISI PEMURNIAN AIR", zh: "制水车间" },
];

// Exact A4 dimensions at 96 DPI (210mm x 297mm)
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const A4_PADDING_Y = 14;
const A4_PADDING_X = 22;
const PRINTABLE_HEIGHT = A4_HEIGHT_PX - A4_PADDING_Y * 2; // 1095px

const HEADER_HEIGHT = 122;
const SEC1_HEIGHT = 88;
const SEC2_BANNER_HEIGHT = 22;
const CAPA_BASE_HEIGHT = 44;
const APPROVAL_SECTION_HEIGHT = 132;

const createSingleMeasurementRow = (): MeasurementRow[] => [
  { parameter: "", result: "", standard: "", evaluation: "" },
];

const createSingleCapaRow = (): CapaRow[] => [
  { action: "", pic: "", targetDate: "", status: "" },
];

function getTodayDotDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function getDefaultDateTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

function getNextReportNoFromRecords(records: InvestigationRecord[]): string {
  if (records.length === 0) return "INV-ENV-2026-001";
  const maxNum = records.reduce((max, item) => {
    const match = item.reportNo.match(/(\d+)$/);
    if (!match) return max;
    const parsed = parseInt(match[1], 10);
    return !Number.isNaN(parsed) && parsed > max ? parsed : max;
  }, 0);
  const nextSeq = String(Math.max(maxNum + 1, records.length + 1)).padStart(
    3,
    "0"
  );
  return `INV-ENV-2026-${nextSeq}`;
}

export default function QmbEnvInvestigationPage() {
  const [copiedWeChat, setCopiedWeChat] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(
    Boolean(supabase)
  );
  const [cloudErrorMsg, setCloudErrorMsg] = useState<string | null>(null);
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [sigErrors, setSigErrors] = useState<Record<string, boolean>>({});

  // Section 1: Identitas Kejadian
  const [reportNo, setReportNo] = useState<string>("INV-ENV-2026-001");
  const [dateTime, setDateTime] = useState<string>(getDefaultDateTime());
  const [incidentLocation, setIncidentLocation] = useState<string>("");
  const [relatedDepartment, setRelatedDepartment] = useState<string>("");
  const [investigationTeam, setInvestigationTeam] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string>(
    "Investigasi Awal / 初步调查"
  );

  // Dropdown state for Location & Department
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [locSearch, setLocSearch] = useState("");
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState("");

  // Section 2: Hasil Investigasi & Pengukuran
  const [chronology, setChronology] = useState<string>("");
  const [hasMeasurements, setHasMeasurements] = useState<boolean>(true);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>(
    createSingleMeasurementRow
  );
  const [rootCause, setRootCause] = useState<string>("");

  // Section 3: Dokumentasi Visual Lapangan
  const [sourcePhotos, setSourcePhotos] = useState<string[]>([]);
  const [sourceCaption, setSourceCaption] = useState<string>("");
  const [impactedPhotos, setImpactedPhotos] = useState<string[]>([]);
  const [impactedCaption, setImpactedCaption] = useState<string>("");
  const [postActionPhotos, setPostActionPhotos] = useState<string[]>([]);
  const [postActionCaption, setPostActionCaption] = useState<string>("");

  // Section 4: Tindak Lanjut (CAPA) & Pengesahan
  const [capaRows, setCapaRows] = useState<CapaRow[]>(createSingleCapaRow);
  const [preparedBy, setPreparedBy] = useState<SignOffInfo>({
    signatureId: "",
    name: "",
    position: "",
    date: getTodayDotDate(),
  });
  const [checkedBy, setCheckedBy] = useState<SignOffInfo>({
    signatureId: "",
    name: "",
    position: "",
    date: getTodayDotDate(),
  });
  const [approvedBy, setApprovedBy] = useState<SignOffInfo>({
    signatureId: "",
    name: "",
    position: "",
    date: getTodayDotDate(),
  });

  // Cloud History (100% Supabase)
  const [history, setHistory] = useState<InvestigationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination state
  const [pages, setPages] = useState<PageSlice[]>([
    {
      pageNumber: 1,
      chronologyLines: [],
      showChronologyHeader: true,
      chronologyContinued: false,
      showMeasurements: true,
      rootCauseLines: [],
      showRootCauseHeader: true,
      rootCauseContinued: false,
      showSection2Banner: true,
      showVisualSection: true,
      showCapaSection: true,
      showApprovalSection: true,
    },
  ]);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const chronoMeasureRef = useRef<HTMLDivElement>(null);
  const rootMeasureRef = useRef<HTMLDivElement>(null);
  const locDropdownRef = useRef<HTMLDivElement>(null);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        locDropdownRef.current &&
        !locDropdownRef.current.contains(e.target as Node)
      ) {
        setLocDropdownOpen(false);
      }
      if (
        deptDropdownRef.current &&
        !deptDropdownRef.current.contains(e.target as Node)
      ) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch 100% from Supabase Database
  const fetchFromSupabase = useCallback(async (updateNextNo = true) => {
    if (!supabase) {
      setCloudConnected(false);
      setCloudErrorMsg(
        "Variabel NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum dikonfigurasi."
      );
      return;
    }

    setLoadingCloud(true);
    setCloudErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from("investigation_reports")
        .select("id, report_no, payload, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCloudConnected(true);

      const cloudRecords: InvestigationRecord[] = (data || [])
        .map((row) => {
          const payload = row.payload as InvestigationRecord | null;
          if (!payload) return null;
          return {
            ...payload,
            id: row.id || payload.id,
          };
        })
        .filter((item): item is InvestigationRecord => item !== null);

      setHistory(cloudRecords);
      if (updateNextNo) {
        setReportNo(getNextReportNoFromRecords(cloudRecords));
      }
    } catch (err: unknown) {
      console.error("Supabase fetch error:", err);
      setCloudConnected(false);
      const message =
        err instanceof Error ? err.message : "Gagal terhubung ke Supabase";
      setCloudErrorMsg(message);
    } finally {
      setLoadingCloud(false);
    }
  }, []);

  useEffect(() => {
    fetchFromSupabase(true);
  }, [fetchFromSupabase]);

  const maxPhotosInColumn = Math.max(
    sourcePhotos.length,
    impactedPhotos.length,
    postActionPhotos.length
  );
  const visualPhotoAreaHeight =
    maxPhotosInColumn === 0
      ? 100
      : maxPhotosInColumn === 1
      ? 124
      : maxPhotosInColumn === 2
      ? 236
      : 348;
  const dynamicVisualSectionHeight =
    SEC2_BANNER_HEIGHT + 22 + visualPhotoAreaHeight + 24;

  // Dynamic A4 Pagination Engine
  const computePagination = useCallback(() => {
    const rawChronoLines = chronology ? chronology.split("\n") : [];
    const rawRootLines = rootCause ? rootCause.split("\n") : [];

    const measureHeights = (
      container: HTMLDivElement | null,
      lines: string[]
    ): number[] => {
      if (!container || lines.length === 0) return [];
      const children = Array.from(container.children) as HTMLElement[];
      return lines.map((_, idx) => {
        const el = children[idx];
        return el ? Math.ceil(el.getBoundingClientRect().height) : 15;
      });
    };

    const chronoHeights = measureHeights(
      chronoMeasureRef.current,
      rawChronoLines
    );
    const rootHeights = measureHeights(rootMeasureRef.current, rawRootLines);

    const dynamicMeasHeight = hasMeasurements
      ? 22 + 22 + measurements.length * 22
      : 22 + 22;

    const dynamicCapaHeight = CAPA_BASE_HEIGHT + capaRows.length * 22;

    const builtPages: PageSlice[] = [];
    let pageNum = 1;
    let cIdx = 0;
    let rIdx = 0;
    let measDone = false;
    let visualDone = false;
    let capaDone = false;
    let approvalDone = false;

    while (
      (cIdx < rawChronoLines.length ||
        rIdx < rawRootLines.length ||
        !measDone ||
        !visualDone ||
        !capaDone ||
        !approvalDone ||
        builtPages.length === 0) &&
      pageNum <= 10
    ) {
      const maxBodyH =
        pageNum === 1
          ? PRINTABLE_HEIGHT - HEADER_HEIGHT - SEC1_HEIGHT
          : PRINTABLE_HEIGHT - HEADER_HEIGHT;

      let usedH = 0;
      const slice: PageSlice = {
        pageNumber: pageNum,
        chronologyLines: [],
        showChronologyHeader: false,
        chronologyContinued: false,
        showMeasurements: false,
        rootCauseLines: [],
        showRootCauseHeader: false,
        rootCauseContinued: false,
        showSection2Banner: false,
        showVisualSection: false,
        showCapaSection: false,
        showApprovalSection: false,
      };

      // 1. Chronology
      if (
        cIdx < rawChronoLines.length ||
        (pageNum === 1 && rawChronoLines.length === 0)
      ) {
        slice.showSection2Banner = true;
        slice.showChronologyHeader = true;
        slice.chronologyContinued = cIdx > 0;
        usedH += SEC2_BANNER_HEIGHT + 22;

        if (rawChronoLines.length === 0) {
          usedH += 64;
        } else {
          usedH += 11;
          const startUsed = usedH;
          while (cIdx < rawChronoLines.length) {
            const h = chronoHeights[cIdx] || 15;
            if (
              usedH + h <= maxBodyH - 12 ||
              slice.chronologyLines.length === 0
            ) {
              slice.chronologyLines.push(rawChronoLines[cIdx]);
              usedH += h;
              cIdx++;
            } else {
              break;
            }
          }
          if (usedH - startUsed < 64) {
            usedH = startUsed + 64;
          }
        }
      }

      // 2. Field Measurements Table
      if (cIdx >= rawChronoLines.length && !measDone) {
        const bannerCost = slice.showSection2Banner ? 0 : SEC2_BANNER_HEIGHT;
        if (usedH + bannerCost + dynamicMeasHeight <= maxBodyH) {
          slice.showSection2Banner = true;
          slice.showMeasurements = true;
          usedH += bannerCost + dynamicMeasHeight;
          measDone = true;
        }
      }

      // 3. Root Cause
      if (
        cIdx >= rawChronoLines.length &&
        measDone &&
        (rIdx < rawRootLines.length ||
          (pageNum === 1 && rawRootLines.length === 0))
      ) {
        const bannerCost = slice.showSection2Banner ? 0 : SEC2_BANNER_HEIGHT;
        if (usedH + bannerCost + 22 + 36 <= maxBodyH) {
          slice.showSection2Banner = true;
          slice.showRootCauseHeader = true;
          slice.rootCauseContinued = rIdx > 0;
          usedH += bannerCost + 22;

          if (rawRootLines.length === 0) {
            usedH += 54;
          } else {
            usedH += 11;
            const startUsed = usedH;
            while (rIdx < rawRootLines.length) {
              const h = rootHeights[rIdx] || 15;
              if (
                usedH + h <= maxBodyH - 12 ||
                slice.rootCauseLines.length === 0
              ) {
                slice.rootCauseLines.push(rawRootLines[rIdx]);
                usedH += h;
                rIdx++;
              } else {
                break;
              }
            }
            if (usedH - startUsed < 54) {
              usedH = startUsed + 54;
            }
          }
        }
      }

      // 4. Visual Documentation Section
      if (
        cIdx >= rawChronoLines.length &&
        measDone &&
        rIdx >= rawRootLines.length &&
        !visualDone
      ) {
        if (usedH + dynamicVisualSectionHeight <= maxBodyH) {
          slice.showVisualSection = true;
          usedH += dynamicVisualSectionHeight;
          visualDone = true;
        }
      }

      // 5. CAPA Section
      if (
        cIdx >= rawChronoLines.length &&
        measDone &&
        rIdx >= rawRootLines.length &&
        visualDone &&
        !capaDone
      ) {
        if (usedH + dynamicCapaHeight <= maxBodyH) {
          slice.showCapaSection = true;
          usedH += dynamicCapaHeight;
          capaDone = true;
        }
      }

      // 6. Approval Section
      const allContentDone =
        cIdx >= rawChronoLines.length &&
        measDone &&
        rIdx >= rawRootLines.length &&
        visualDone &&
        capaDone;

      if (allContentDone && !approvalDone) {
        const section4BannerCost = slice.showCapaSection
          ? 0
          : SEC2_BANNER_HEIGHT;
        if (usedH + section4BannerCost + APPROVAL_SECTION_HEIGHT <= maxBodyH) {
          slice.showApprovalSection = true;
          usedH += section4BannerCost + APPROVAL_SECTION_HEIGHT;
          approvalDone = true;
        }
      }

      builtPages.push(slice);
      pageNum++;
    }

    setPages(builtPages);
  }, [
    chronology,
    rootCause,
    hasMeasurements,
    measurements.length,
    capaRows.length,
    dynamicVisualSectionHeight,
  ]);

  useLayoutEffect(() => {
    computePagination();
  }, [computePagination]);

  const toggleInspectorName = (name: string) => {
    const current = investigationTeam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (current.includes(name)) {
      setInvestigationTeam(current.filter((item) => item !== name).join(", "));
    } else {
      setInvestigationTeam([...current, name].join(", "));
    }
  };

  const handleCategoryPhotoUpload = (
    files: FileList | null,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (!files || files.length === 0) return;
    const remaining = 3 - currentList.length;
    const picked = Array.from(files).slice(0, remaining);

    picked.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 800;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL("image/jpeg", 0.78);
            setter((prev) => (prev.length < 3 ? [...prev, compressed] : prev));
          }
        };
        if (ev.target?.result) {
          img.src = ev.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const updateMeasurement = (
    index: number,
    field: keyof MeasurementRow,
    value: string
  ) => {
    setMeasurements((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const updateCapa = (
    index: number,
    field: keyof CapaRow,
    value: string
  ) => {
    setCapaRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSignOffSelect = (
    role: "prepared" | "checked" | "approved",
    sigId: string
  ) => {
    const found = ALL_SIGNERS.find((s) => s.id === sigId);
    if (sigId) {
      setSigErrors((prev) => ({ ...prev, [sigId]: false }));
    }
    const updater = (prev: SignOffInfo): SignOffInfo => ({
      ...prev,
      signatureId: sigId,
      name: found ? found.name : "",
      position: found ? found.title : "",
    });

    if (role === "prepared") setPreparedBy(updater);
    if (role === "checked") setCheckedBy(updater);
    if (role === "approved") setApprovedBy(updater);
  };

  const fillSampleData = () => {
    const today = getTodayDotDate();
    setDateTime(getDefaultDateTime());
    setIncidentLocation("DIVISI AIR LIMBAH TERNARY / 三元废水车间");
    setRelatedDepartment("DIVISI AIR LIMBAH TERNARY / 三元废水车间");
    setInvestigationTeam("陈晓旭, 卡尔迪");
    setReportStatus("Proses Perbaikan / 整改中");
    setChronology(
      "Pada pukul 08:15 WITA, tim patroli lingkungan mendeteksi kenaikan nilai pH pada bak kontrol outlet air hujan sektor selatan akibat luapan tangki netralisasi T-102 saat pergantian shift.\n上午08:15，环境巡检组在日常排查中发现南区雨水排放口监控池出现pH值波动现象，经排查系交接班期间中和槽T-102液位过高发生短暂溢流所致。"
    );
    setHasMeasurements(true);
    setMeasurements([
      {
        parameter: "pH Air Limbah / 废水pH值",
        result: "9.4",
        standard: "6.0 - 9.0",
        evaluation: "Melebihi NAB / 超标",
      },
    ]);
    setRootCause(
      "Sensor level ultrasonik pada tangki T-102 mengalami kerak (scaling) sehingga pembacaan level tertunda.\nT-102中和槽超声波液位计探头结垢，导致液位信号反馈延迟。"
    );
    setSourceCaption("Titik luapan tangki T-102 / T-102槽溢流点");
    setImpactedCaption("Saluran drainase sekitar unit / 周边排水沟");
    setPostActionCaption("Pembersihan & penutupan katup / 清理与阀门封堵后");
    setCapaRows([
      {
        action:
          "Pompa kembali air di bak kontrol ke kolam pengolahan & bersihkan sensor T-102 / 将监控池水抽回处理池并清理液位计",
        pic: "PIC Area / 车间责任人",
        targetDate: today,
        status: "Selesai / 已完成",
      },
    ]);
    setPreparedBy({
      signatureId: "sukardi-syam",
      name: "SUKARDI SYAM 卡尔迪",
      position: "Foreman / 班长",
      date: today,
    });
    setCheckedBy({
      signatureId: "bian-yuandong",
      name: "BIAN YUANDONG / 卞远东",
      position: "Wakil Direktur / 副总经理",
      date: today,
    });
    setApprovedBy({
      signatureId: "rao-youqing",
      name: "RAO YOUQING / 饶友清",
      position: "Direktur / 总经理",
      date: today,
    });
  };

  const resetForm = () => {
    const today = getTodayDotDate();
    setReportNo(getNextReportNoFromRecords(history));
    setDateTime(getDefaultDateTime());
    setIncidentLocation("");
    setRelatedDepartment("");
    setInvestigationTeam("");
    setReportStatus("Investigasi Awal / 初步调查");
    setChronology("");
    setHasMeasurements(true);
    setMeasurements(createSingleMeasurementRow());
    setRootCause("");
    setSourcePhotos([]);
    setSourceCaption("");
    setImpactedPhotos([]);
    setImpactedCaption("");
    setPostActionPhotos([]);
    setPostActionCaption("");
    setCapaRows(createSingleCapaRow());
    setPreparedBy({ signatureId: "", name: "", position: "", date: today });
    setCheckedBy({ signatureId: "", name: "", position: "", date: today });
    setApprovedBy({ signatureId: "", name: "", position: "", date: today });
    setSigErrors({});
  };

  // Save 100% directly to Supabase Storage + Supabase Database
  const handleSaveToSupabase = async () => {
    if (!supabase) {
      alert(
        "Koneksi Supabase belum aktif. Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah diatur."
      );
      return;
    }

    if (!reportNo.trim() || !chronology.trim()) {
      alert(
        "Mohon isi minimal No. Laporan dan Kronologi Kejadian sebelum menyimpan. / 保存前请至少填写报告编号和事件经过。"
      );
      return;
    }

    setSaving(true);
    setCloudErrorMsg(null);
    const cleanReportNo = reportNo.trim();

    try {
      // 1. Upload all new base64 photos strictly to Supabase Storage
      const [finalSourcePhotos, finalImpactedPhotos, finalPostActionPhotos] =
        await Promise.all([
          Promise.all(
            sourcePhotos.map((src) =>
              uploadPhotoToSupabase(src, "investigation")
            )
          ),
          Promise.all(
            impactedPhotos.map((src) =>
              uploadPhotoToSupabase(src, "investigation")
            )
          ),
          Promise.all(
            postActionPhotos.map((src) =>
              uploadPhotoToSupabase(src, "investigation")
            )
          ),
        ]);

      setSourcePhotos(finalSourcePhotos);
      setImpactedPhotos(finalImpactedPhotos);
      setPostActionPhotos(finalPostActionPhotos);

      const existingItem = history.find(
        (item) => item.reportNo === cleanReportNo
      );

      const record: InvestigationRecord = {
        id:
          existingItem?.id ||
          (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        reportNo: cleanReportNo,
        dateTime,
        incidentLocation,
        relatedDepartment,
        investigationTeam,
        reportStatus,
        chronology,
        hasMeasurements,
        measurements,
        rootCause,
        sourcePhotos: finalSourcePhotos,
        sourceCaption,
        impactedPhotos: finalImpactedPhotos,
        impactedCaption,
        postActionPhotos: finalPostActionPhotos,
        postActionCaption,
        capaRows,
        preparedBy,
        checkedBy,
        approvedBy,
        createdAt: existingItem?.createdAt || new Date().toISOString(),
      };

      // 2. Upsert strictly to Supabase Table
      const { error } = await supabase.from("investigation_reports").upsert(
        {
          report_no: cleanReportNo,
          date_time: dateTime,
          incident_location: incidentLocation,
          related_department: relatedDepartment,
          report_status: reportStatus,
          payload: record,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "report_no" }
      );

      if (error) throw error;

      setCloudConnected(true);
      await fetchFromSupabase(false);
      setSavedToast("Tersimpan ke Supabase! / 已保存到云端！");
      setTimeout(() => setSavedToast(null), 3000);
    } catch (err: unknown) {
      console.error("Supabase save error:", err);
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan ke Supabase.";
      setCloudErrorMsg(message);
      alert(`Gagal menyimpan ke database Supabase:\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const loadRecord = (rec: InvestigationRecord) => {
    setReportNo(rec.reportNo);
    setDateTime(rec.dateTime);
    setIncidentLocation(rec.incidentLocation);
    setRelatedDepartment(rec.relatedDepartment);
    setInvestigationTeam(rec.investigationTeam);
    setReportStatus(rec.reportStatus);
    setChronology(rec.chronology);
    setHasMeasurements(
      rec.hasMeasurements !== undefined ? rec.hasMeasurements : true
    );
    setMeasurements(
      rec.measurements?.length ? rec.measurements : createSingleMeasurementRow()
    );
    setRootCause(rec.rootCause);
    setSourcePhotos(rec.sourcePhotos || []);
    setSourceCaption(rec.sourceCaption || "");
    setImpactedPhotos(rec.impactedPhotos || []);
    setImpactedCaption(rec.impactedCaption || "");
    setPostActionPhotos(rec.postActionPhotos || []);
    setPostActionCaption(rec.postActionCaption || "");
    setCapaRows(rec.capaRows?.length ? rec.capaRows : createSingleCapaRow());
    setPreparedBy(rec.preparedBy);
    setCheckedBy(rec.checkedBy);
    setApprovedBy(rec.approvedBy);
    setSigErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (rec: InvestigationRecord) => {
    if (!supabase) {
      alert("Koneksi Supabase belum aktif.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus laporan ${rec.reportNo} secara permanen dari database? / 确定要从数据库永久删除报告 ${rec.reportNo} 吗？`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("investigation_reports")
        .delete()
        .eq("report_no", rec.reportNo);

      if (error) throw error;

      setHistory((prev) =>
        prev.filter((item) => item.reportNo !== rec.reportNo)
      );
    } catch (err: unknown) {
      console.error("Supabase delete error:", err);
      const message =
        err instanceof Error ? err.message : "Gagal menghapus data.";
      alert(`Gagal menghapus dari Supabase:\n${message}`);
    }
  };

  const handleExportPNG = async () => {
    setExporting("png");
    try {
      for (let i = 0; i < pages.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
        });
        const link = document.createElement("a");
        const suffix = pages.length > 1 ? `-Hal${i + 1}` : "";
        link.download = `${reportNo || DOC_CODE}${suffix}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch (err) {
      console.error("PNG Export Error:", err);
      alert("Gagal mengekspor PNG. / PNG导出失败。");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      for (let i = 0; i < pages.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: A4_WIDTH_PX,
          height: A4_HEIGHT_PX,
        });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
      }
      pdf.save(`${reportNo || DOC_CODE}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Gagal mengekspor PDF. / PDF导出失败。");
    } finally {
      setExporting(null);
    }
  };

  const handleCopyWeChat = () => {
    const msg = `【PT QMB - LAPORAN INVESTIGASI KHUSUS INSIDEN / 环境异常事件专项调查报告】
Kode Dokumen / 代码: ${DOC_CODE}
No. Laporan / 报告编号: ${reportNo || "-"}
Tanggal & Waktu / 日期与时间: ${dateTime || "-"}
Lokasi Kejadian / 发生地点: ${incidentLocation || "-"}
Departemen Terkait / 责任部门: ${relatedDepartment || "-"}
Tim Investigasi / 调查人员: ${investigationTeam || "-"}
Status / 报告状态: ${reportStatus || "-"}

1. Kronologi & Uraian Kejadian / 事件经过与问题描述:
${chronology || "-"}

2. Penyebab Utama / 根本原因:
${rootCause || "-"}

马上行动 不找借口 不讲理由 只看结果`;

    navigator.clipboard.writeText(msg);
    setCopiedWeChat(true);
    setTimeout(() => setCopiedWeChat(false), 2500);
  };

  const filteredLocDivisions = DIVISION_LIST.filter((d) => {
    const q = locSearch.trim().toLowerCase();
    if (!q) return true;
    return d.id.toLowerCase().includes(q) || d.zh.toLowerCase().includes(q);
  });

  const filteredDeptDivisions = DIVISION_LIST.filter((d) => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return true;
    return d.id.toLowerCase().includes(q) || d.zh.toLowerCase().includes(q);
  });

  const filteredHistory = history.filter((item) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      item.reportNo.toLowerCase().includes(q) ||
      item.incidentLocation.toLowerCase().includes(q) ||
      item.relatedDepartment.toLowerCase().includes(q) ||
      item.chronology.toLowerCase().includes(q)
    );
  });

  const centeredCellBox = (
    minHeight: string,
    horizontalPadding = "4px"
  ): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight,
    paddingTop: "1px",
    paddingBottom: "5px",
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    textAlign: "center",
    lineHeight: 1.2,
  });

  const sectionBannerStyle: React.CSSProperties = {
    backgroundColor: "#D9E2F3",
    border: "1px solid #000000",
    padding: "1px 8px 5px 8px",
    fontSize: "10px",
    fontWeight: 700,
    lineHeight: 1.2,
    height: `${SEC2_BANNER_HEIGHT}px`,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  };

  const subHeaderStyle: React.CSSProperties = {
    border: "1px solid #000000",
    padding: "1px 8px 5px 8px",
    fontSize: "9.8px",
    fontWeight: 700,
    lineHeight: 1.2,
    height: "22px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  };

  const renderVisualBox = (
    photos: string[],
    caption: string,
    labelPrefix: string
  ) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          height: `${visualPhotoAreaHeight}px`,
          borderBottom: "1px solid #000000",
          padding: "5px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: photos.length > 0 ? "flex-start" : "center",
          gap: "4px",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {photos.map((src, idx) => (
          <div
            key={idx}
            style={{
              width: "100%",
              height: "108px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={src}
              alt={`${labelPrefix} ${idx + 1}`}
              crossOrigin={src.startsWith("http") ? "anonymous" : undefined}
              style={{
                maxWidth: "100%",
                maxHeight: "106px",
                objectFit: "contain",
              }}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          minHeight: "24px",
          padding: "2px 6px 5px 6px",
          fontSize: "9px",
          lineHeight: 1.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          wordBreak: "break-word",
        }}
      >
        <span>
          <strong>Keterangan (说明):</strong> {caption}
        </span>
      </div>
    </div>
  );

  const renderSignOffColumn = (info: SignOffInfo, isLastColumn: boolean) => {
    const sup = ALL_SIGNERS.find((s) => s.id === info.signatureId);
    return (
      <div
        style={{
          borderRight: isLastColumn ? "none" : "1px solid #000000",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: "50px",
            borderBottom: "1px solid #000000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "3px",
          }}
        >
          {sup &&
            sup.signatureUrl &&
            (!sigErrors[sup.id] ? (
              <img
                src={sup.signatureUrl}
                alt={`TTD ${sup.name}`}
                onError={() =>
                  setSigErrors((prev) => ({ ...prev, [sup.id]: true }))
                }
                style={{
                  maxWidth: "120px",
                  maxHeight: "42px",
                  objectFit: "contain",
                }}
              />
            ) : (
              <span style={{ fontSize: "8px", color: "#dc2626" }}>
                File TTD tidak ditemukan
              </span>
            ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            borderBottom: "1px solid #000000",
            minHeight: "19px",
            fontSize: "9px",
          }}
        >
          <div
            style={{
              borderRight: "1px solid #000000",
              padding: "1px 4px 4px 5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
            }}
          >
            Nama (姓名):
          </div>
          <div
            style={{
              padding: "1px 5px 4px 5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              wordBreak: "break-word",
            }}
          >
            {info.name}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            borderBottom: "1px solid #000000",
            minHeight: "19px",
            fontSize: "9px",
          }}
        >
          <div
            style={{
              borderRight: "1px solid #000000",
              padding: "1px 4px 4px 5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
            }}
          >
            Jabatan(职位):
          </div>
          <div
            style={{
              padding: "1px 5px 4px 5px",
              display: "flex",
              alignItems: "center",
              wordBreak: "break-word",
            }}
          >
            {info.position}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            minHeight: "19px",
            fontSize: "9px",
          }}
        >
          <div
            style={{
              borderRight: "1px solid #000000",
              padding: "1px 4px 4px 5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
            }}
          >
            Tanggal (日期):
          </div>
          <div
            style={{
              padding: "1px 5px 4px 5px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {info.date}
          </div>
        </div>
      </div>
    );
  };

  const totalPages = pages.length;

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-slate-800 pb-16">
      {/* Hidden Line Measurer */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "732px",
          fontFamily: '"Times New Roman", "SimSun", "Microsoft YaHei", serif',
          fontSize: "10px",
          lineHeight: 1.4,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div ref={chronoMeasureRef}>
          {(chronology ? chronology.split("\n") : []).map((line, i) => (
            <div
              key={i}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "15px",
              }}
            >
              {line || " "}
            </div>
          ))}
        </div>
        <div ref={rootMeasureRef}>
          {(rootCause ? rootCause.split("\n") : []).map((line, i) => (
            <div
              key={i}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "15px",
              }}
            >
              {line || " "}
            </div>
          ))}
        </div>
      </div>

      {/* Shared Sticky Top Bar */}
      <TopNavHeader />

      {/* Main Stacked Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* SECTION 1 (TOP): Form Input Laporan Investigasi */}
        <section className="bg-white rounded-2xl border border-[#5DA295]/25 shadow-sm overflow-visible">
          <div className="bg-[#5DA295] px-5 py-3.5 text-white rounded-t-2xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <h2 className="font-bold text-sm sm:text-base">
                Input Data Laporan Investigasi / 专项调查报告录入
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fillSampleData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Isi Contoh Data / 填充示例
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Cepat / 快速重置
              </button>
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* 1. IDENTITAS KEJADIAN */}
            <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#5DA295]/25 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3e776c]">
                  1. Identitas Kejadian / 基本信息
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    cloudConnected
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {cloudConnected ? (
                    <>
                      <Cloud className="w-3 h-3" />
                      Supabase Cloud Aktif
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-3 h-3" />
                      Supabase Terputus
                    </>
                  )}
                </span>
              </div>

              {cloudErrorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <strong>Status Koneksi Database:</strong> {cloudErrorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Laporan / 报告编号
                  </label>
                  <input
                    type="text"
                    value={reportNo}
                    onChange={(e) => setReportNo(e.target.value)}
                    placeholder="INV-ENV-2026-001"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal & Waktu / 日期与时间
                  </label>
                  <input
                    type="text"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    placeholder="2026.11.17 08:30"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                {/* Lokasi Kejadian Dropdown + Manual */}
                <div className="relative" ref={locDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lokasi Kejadian / 发生地点
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={incidentLocation}
                      onFocus={() => setLocDropdownOpen(true)}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      placeholder="Pilih divisi atau ketik lokasi spesifik..."
                      className="w-full pl-3 pr-14 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                    />
                    {incidentLocation && (
                      <button
                        type="button"
                        onClick={() => setIncidentLocation("")}
                        className="absolute right-7 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocDropdownOpen((p) => !p)}
                      className="absolute right-2 p-1 text-slate-500 hover:text-[#5DA295] cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          locDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {locDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-40 overflow-hidden">
                      <div className="p-2 bg-[#FFFDF8] border-b border-slate-200">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={locSearch}
                            onChange={(e) => setLocSearch(e.target.value)}
                            placeholder="Cari divisi / 搜索车间..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {filteredLocDivisions.map((div, i) => {
                          const combined = `${div.id} / ${div.zh}`;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setIncidentLocation(combined);
                                setLocDropdownOpen(false);
                                setLocSearch("");
                              }}
                              className="w-full px-3 py-2 text-center hover:bg-[#5DA295]/10 transition cursor-pointer flex flex-col items-center"
                            >
                              <span className="text-xs font-bold text-slate-900">
                                {div.id}
                              </span>
                              <span className="text-[11px] text-slate-600">
                                {div.zh}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Departemen Terkait Dropdown + Manual */}
                <div className="relative" ref={deptDropdownRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departemen Terkait / 责任部门
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={relatedDepartment}
                      onFocus={() => setDeptDropdownOpen(true)}
                      onChange={(e) => setRelatedDepartment(e.target.value)}
                      placeholder="Pilih departemen atau ketik manual..."
                      className="w-full pl-3 pr-14 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                    />
                    {relatedDepartment && (
                      <button
                        type="button"
                        onClick={() => setRelatedDepartment("")}
                        className="absolute right-7 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeptDropdownOpen((p) => !p)}
                      className="absolute right-2 p-1 text-slate-500 hover:text-[#5DA295] cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          deptDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {deptDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-40 overflow-hidden">
                      <div className="p-2 bg-[#FFFDF8] border-b border-slate-200">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={deptSearch}
                            onChange={(e) => setDeptSearch(e.target.value)}
                            placeholder="Cari departemen / 搜索责任部门..."
                            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                        {filteredDeptDivisions.map((div, i) => {
                          const combined = `${div.id} / ${div.zh}`;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setRelatedDepartment(combined);
                                setDeptDropdownOpen(false);
                                setDeptSearch("");
                              }}
                              className="w-full px-3 py-2 text-center hover:bg-[#5DA295]/10 transition cursor-pointer flex flex-col items-center"
                            >
                              <span className="text-xs font-bold text-slate-900">
                                {div.id}
                              </span>
                              <span className="text-[11px] text-slate-600">
                                {div.zh}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tim Investigasi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tim Investigasi / 调查人员
                    </label>
                    <div className="flex items-center gap-1">
                      {INSPECTOR_CHIPS.map((chip) => {
                        const active = investigationTeam.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleInspectorName(chip)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                              active
                                ? "bg-[#5DA295] text-white border-[#5DA295]"
                                : "bg-white text-slate-600 border-slate-300 hover:border-[#5DA295]"
                            }`}
                          >
                            {active ? `✓ ${chip}` : `+ ${chip}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={investigationTeam}
                    onChange={(e) => setInvestigationTeam(e.target.value)}
                    placeholder="Nama anggota tim investigasi / 调查小组成员"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                {/* Status Laporan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Laporan / 报告状态
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. HASIL INVESTIGASI & PENGUKURAN */}
            <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#5DA295]/25 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#3e776c]">
                2. Hasil Investigasi & Pengukuran / 调查结果与监测数据
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2.1 Kronologi & Uraian Kejadian / 事件经过与问题描述
                </label>
                <textarea
                  rows={3}
                  value={chronology}
                  onChange={(e) => setChronology(e.target.value)}
                  placeholder="Tuliskan kronologi lengkap kejadian & uraian temuan dalam Bahasa Indonesia & 中文..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>

              {/* 2.2 Data Pengukuran Lapangan */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    2.2 Data Pengukuran Lapangan / 现场监测数据
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setHasMeasurements(true)}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          hasMeasurements
                            ? "bg-[#5DA295] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Isi Data / 填写数据
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasMeasurements(false)}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          !hasMeasurements
                            ? "bg-slate-700 text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Kosongkan / 留空
                      </button>
                    </div>

                    {hasMeasurements && (
                      <button
                        type="button"
                        onClick={() =>
                          setMeasurements((prev) => [
                            ...prev,
                            {
                              parameter: "",
                              result: "",
                              standard: "",
                              evaluation: "",
                            },
                          ])
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5DA295]/15 hover:bg-[#5DA295]/25 text-[#3e776c] text-[11px] font-bold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Tambah Baris / 添加行
                      </button>
                    )}
                  </div>
                </div>

                {hasMeasurements ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                          <th className="py-2 px-2.5 text-left font-bold">
                            Parameter Uji (监测参数)
                          </th>
                          <th className="py-2 px-2.5 text-left font-bold">
                            Hasil Ukur (监测结果)
                          </th>
                          <th className="py-2 px-2.5 text-left font-bold">
                            Baku Mutu / NAB (标准限值)
                          </th>
                          <th className="py-2 px-2.5 text-left font-bold">
                            Keterangan / Evaluasi (评估说明)
                          </th>
                          <th className="py-2 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {measurements.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.parameter}
                                onChange={(e) =>
                                  updateMeasurement(
                                    idx,
                                    "parameter",
                                    e.target.value
                                  )
                                }
                                placeholder="Mis. pH / TSS / SO2"
                                className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.result}
                                onChange={(e) =>
                                  updateMeasurement(
                                    idx,
                                    "result",
                                    e.target.value
                                  )
                                }
                                placeholder="Hasil..."
                                className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.standard}
                                onChange={(e) =>
                                  updateMeasurement(
                                    idx,
                                    "standard",
                                    e.target.value
                                  )
                                }
                                placeholder="Standar..."
                                className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.evaluation}
                                onChange={(e) =>
                                  updateMeasurement(
                                    idx,
                                    "evaluation",
                                    e.target.value
                                  )
                                }
                                placeholder="Evaluasi..."
                                className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                              />
                            </td>
                            <td className="p-1 text-center">
                              {measurements.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMeasurements((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-500">
                    Bagian pengukuran lapangan dikosongkan (tidak ada pengukuran
                    parameter lingkungan). / 现场监测数据已选择留空。
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2.3 Penyebab Utama / Akar Masalah / 根本原因
                </label>
                <textarea
                  rows={3}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Jelaskan analisis akar penyebab kejadian (5-Why / Teknis / Operasional) dalam Bahasa Indonesia & 中文..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>
            </div>

            {/* 3. DOKUMENTASI VISUAL LAPANGAN */}
            <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#5DA295]/25 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#3e776c]">
                3. Dokumentasi Visual Lapangan / 现场影像记录 (Maks. 3 Foto
                Bersusun per Kategori)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Kategori 1 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      1. Titik Sumber Kejadian (排放/发生源点)
                    </span>
                    <span className="text-[11px] font-bold text-[#3e776c]">
                      {sourcePhotos.length}/3
                    </span>
                  </div>

                  {sourcePhotos.length < 3 && (
                    <label className="flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-dashed border-[#5DA295]/40 rounded-lg bg-[#FFFDF8] hover:bg-[#5DA295]/5 text-xs font-medium text-[#3e776c] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto / 上传照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleCategoryPhotoUpload(
                            e.target.files,
                            sourcePhotos,
                            setSourcePhotos
                          );
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}

                  {sourcePhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {sourcePhotos.map((src, i) => (
                        <div
                          key={i}
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img
                            src={src}
                            alt={`Sumber ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSourcePhotos((p) =>
                                p.filter((_, idx) => idx !== i)
                              )
                            }
                            className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={sourceCaption}
                    onChange={(e) => setSourceCaption(e.target.value)}
                    placeholder="Keterangan (说明)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                {/* Kategori 2 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      2. Area Terdampak (受影响区域)
                    </span>
                    <span className="text-[11px] font-bold text-[#3e776c]">
                      {impactedPhotos.length}/3
                    </span>
                  </div>

                  {impactedPhotos.length < 3 && (
                    <label className="flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-dashed border-[#5DA295]/40 rounded-lg bg-[#FFFDF8] hover:bg-[#5DA295]/5 text-xs font-medium text-[#3e776c] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto / 上传照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleCategoryPhotoUpload(
                            e.target.files,
                            impactedPhotos,
                            setImpactedPhotos
                          );
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}

                  {impactedPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {impactedPhotos.map((src, i) => (
                        <div
                          key={i}
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img
                            src={src}
                            alt={`Terdampak ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setImpactedPhotos((p) =>
                                p.filter((_, idx) => idx !== i)
                              )
                            }
                            className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={impactedCaption}
                    onChange={(e) => setImpactedCaption(e.target.value)}
                    placeholder="Keterangan (说明)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                {/* Kategori 3 */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      3. Kondisi Pasca-Penanganan (处理后现场状况)
                    </span>
                    <span className="text-[11px] font-bold text-[#3e776c]">
                      {postActionPhotos.length}/3
                    </span>
                  </div>

                  {postActionPhotos.length < 3 && (
                    <label className="flex items-center justify-center gap-1.5 py-2 px-3 border-2 border-dashed border-[#5DA295]/40 rounded-lg bg-[#FFFDF8] hover:bg-[#5DA295]/5 text-xs font-medium text-[#3e776c] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto / 上传照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleCategoryPhotoUpload(
                            e.target.files,
                            postActionPhotos,
                            setPostActionPhotos
                          );
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}

                  {postActionPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {postActionPhotos.map((src, i) => (
                        <div
                          key={i}
                          className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
                        >
                          <img
                            src={src}
                            alt={`Pasca ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPostActionPhotos((p) =>
                                p.filter((_, idx) => idx !== i)
                              )
                            }
                            className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={postActionCaption}
                    onChange={(e) => setPostActionCaption(e.target.value)}
                    placeholder="Keterangan (说明)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>
              </div>
            </div>

            {/* 4. TINDAK LANJUT (CAPA) & PENGESAHAN */}
            <div className="p-4 rounded-xl bg-[#FFFDF8] border border-[#5DA295]/25 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3e776c]">
                  4. Tindak Lanjut & Pengesahan / 整改措施与审批
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCapaRows((prev) => [
                      ...prev,
                      { action: "", pic: "", targetDate: "", status: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5DA295]/15 hover:bg-[#5DA295]/25 text-[#3e776c] text-[11px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Tambah Tindakan / 添加措施
                </button>
              </div>

              {/* CAPA Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="py-2 px-2 text-center font-bold w-10">
                        No
                      </th>
                      <th className="py-2 px-2.5 text-left font-bold">
                        Tindakan Perbaikan & Pencegahan (纠正与预防措施)
                      </th>
                      <th className="py-2 px-2.5 text-left font-bold w-36">
                        PIC (责任人)
                      </th>
                      <th className="py-2 px-2.5 text-left font-bold w-32">
                        Target Selesai (完成期限)
                      </th>
                      <th className="py-2 px-2.5 text-left font-bold w-32">
                        Status (状态)
                      </th>
                      <th className="py-2 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {capaRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5 text-center font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.action}
                            onChange={(e) =>
                              updateCapa(idx, "action", e.target.value)
                            }
                            placeholder="Uraian tindakan perbaikan & pencegahan..."
                            className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.pic}
                            onChange={(e) =>
                              updateCapa(idx, "pic", e.target.value)
                            }
                            placeholder="PIC..."
                            className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.targetDate}
                            onChange={(e) =>
                              updateCapa(idx, "targetDate", e.target.value)
                            }
                            placeholder="2026.11.20"
                            className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.status}
                            onChange={(e) =>
                              updateCapa(idx, "status", e.target.value)
                            }
                            placeholder="Proses / Selesai"
                            className="w-full px-2 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                          />
                        </td>
                        <td className="p-1 text-center">
                          {capaRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCapaRows((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 3 Kolom Pengesahan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                    Dibuat Oleh (编制人)
                  </div>
                  <select
                    value={preparedBy.signatureId}
                    onChange={(e) =>
                      handleSignOffSelect("prepared", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  >
                    <option value="">-- TTD Basah / Kosong (留空) --</option>
                    {PREPARED_BY_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={preparedBy.name}
                    onChange={(e) =>
                      setPreparedBy((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Nama (姓名)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={preparedBy.position}
                    onChange={(e) =>
                      setPreparedBy((p) => ({
                        ...p,
                        position: e.target.value,
                      }))
                    }
                    placeholder="Jabatan (职位)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={preparedBy.date}
                    onChange={(e) =>
                      setPreparedBy((p) => ({ ...p, date: e.target.value }))
                    }
                    placeholder="Tanggal (日期)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                    Diperiksa Oleh (审核人)
                  </div>
                  <select
                    value={checkedBy.signatureId}
                    onChange={(e) =>
                      handleSignOffSelect("checked", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  >
                    <option value="">-- TTD Basah / Kosong (留空) --</option>
                    {REVIEW_APPROVE_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={checkedBy.name}
                    onChange={(e) =>
                      setCheckedBy((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Nama (姓名)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={checkedBy.position}
                    onChange={(e) =>
                      setCheckedBy((p) => ({
                        ...p,
                        position: e.target.value,
                      }))
                    }
                    placeholder="Jabatan (职位)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={checkedBy.date}
                    onChange={(e) =>
                      setCheckedBy((p) => ({ ...p, date: e.target.value }))
                    }
                    placeholder="Tanggal (日期)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                    Disetujui Oleh (批准人)
                  </div>
                  <select
                    value={approvedBy.signatureId}
                    onChange={(e) =>
                      handleSignOffSelect("approved", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  >
                    <option value="">-- TTD Basah / Kosong (留空) --</option>
                    {REVIEW_APPROVE_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={approvedBy.name}
                    onChange={(e) =>
                      setApprovedBy((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Nama (姓名)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={approvedBy.position}
                    onChange={(e) =>
                      setApprovedBy((p) => ({
                        ...p,
                        position: e.target.value,
                      }))
                    }
                    placeholder="Jabatan (职位)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                  <input
                    type="text"
                    value={approvedBy.date}
                    onChange={(e) =>
                      setApprovedBy((p) => ({ ...p, date: e.target.value }))
                    }
                    placeholder="Tanggal (日期)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDF8] border border-slate-200 rounded-lg focus:outline-none focus:border-[#5DA295]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 (BELOW INPUT FORM): Pratinjau Dokumen A4 */}
        <section className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#5DA295]/25 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveToSupabase}
              disabled={saving || !cloudConnected}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5DA295] hover:bg-[#4c8b7f] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {savedToast ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving
                ? "Mengunggah & Menyimpan... / 正在保存..."
                : savedToast
                ? savedToast
                : "Simpan ke Supabase / 保存到云端"}
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyWeChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition cursor-pointer"
              >
                {copiedWeChat ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedWeChat
                  ? "Tersalin / 已复制"
                  : "Salin WeChat / 复制微信"}
              </button>

              <button
                type="button"
                onClick={handleExportPNG}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#5DA295]" />
                {exporting === "png"
                  ? "Proses... / 导出中..."
                  : "Ekspor PNG / 导出 PNG"}
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting === "pdf"
                  ? "Proses... / 导出中..."
                  : "Ekspor PDF / 导出 PDF"}
              </button>
            </div>
          </div>

          <div className="bg-slate-200/70 p-4 sm:p-6 rounded-2xl border border-[#5DA295]/25 shadow-inner overflow-x-auto space-y-6">
            {pages.map((slice, idx) => (
              <div key={slice.pageNumber} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-600 w-[794px] mx-auto">
                  <span>
                    Pratinjau Dokumen — Halaman {slice.pageNumber} dari{" "}
                    {totalPages}
                  </span>
                  <span>
                    {DOC_CODE} | {reportNo}
                  </span>
                </div>

                <div
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    width: `${A4_WIDTH_PX}px`,
                    height: `${A4_HEIGHT_PX}px`,
                    margin: "0 auto",
                    padding: `${A4_PADDING_Y}px ${A4_PADDING_X}px`,
                    boxSizing: "border-box",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontFamily:
                      '"Times New Roman", "SimSun", "Microsoft YaHei", serif',
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      border: "1.5px solid #000000",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* HEADER BLOCK */}
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                      }}
                    >
                      <colgroup>
                        <col style={{ width: "25%" }} />
                        <col style={{ width: "43%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "16%" }} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td
                            rowSpan={2}
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div style={centeredCellBox("48px", "6px")}>
                              {!logoError ? (
                                <img
                                  src="/qmb-logo.png"
                                  alt="PT QMB Logo"
                                  onError={() => setLogoError(true)}
                                  style={{
                                    maxWidth: "145px",
                                    maxHeight: "40px",
                                    objectFit: "contain",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    fontWeight: 900,
                                    fontSize: "15px",
                                    color: "#008566",
                                  }}
                                >
                                  QMB 青美邦
                                </div>
                              )}
                            </div>
                          </td>
                          <td
                            rowSpan={2}
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div style={centeredCellBox("48px", "6px")}>
                              <div
                                style={{
                                  fontSize: "13.5px",
                                  fontWeight: 700,
                                  letterSpacing: "1px",
                                }}
                              >
                                青美邦新能源材料有限公司
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  marginTop: "2px",
                                }}
                              >
                                PT QMB New Energy Materials Co., Ltd.
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                              }}
                            >
                              Kode 代码
                            </div>
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "2px"),
                                fontSize: "8.8px",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {DOC_CODE}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                              }}
                            >
                              No. Rev 修订
                            </div>
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                              }}
                            >
                              {FIXED_REV_NO}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={2}
                            rowSpan={2}
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div style={centeredCellBox("48px", "6px")}>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                }}
                              >
                                LAPORAN INVESTIGASI KHUSUS INSIDEN / TEMUAN
                                LINGKUNGAN
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  letterSpacing: "1px",
                                  marginTop: "2px",
                                }}
                              >
                                环境异常事件专项调查报告
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "2px"),
                                fontSize: "9px",
                              }}
                            >
                              Tgl. Terbit 签发日期
                            </div>
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                              }}
                            >
                              {FIXED_ISSUE_DATE}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              borderRight: "1px solid #000000",
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                              }}
                            >
                              Halaman 页
                            </div>
                          </td>
                          <td
                            style={{
                              borderBottom: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("24px", "3px"),
                                fontSize: "9px",
                                fontWeight: 600,
                              }}
                            >
                              {totalPages === 1
                                ? slice.pageNumber
                                : `${slice.pageNumber} / ${totalPages}`}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              backgroundColor: "#000000",
                              color: "#ffffff",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("22px", "8px"),
                                fontWeight: 700,
                                fontSize: "10.5px",
                                letterSpacing: "2px",
                              }}
                            >
                              马上行动 &nbsp;&nbsp;&nbsp;&nbsp; 不找借口
                              &nbsp;&nbsp;&nbsp;&nbsp; 不讲理由
                              &nbsp;&nbsp;&nbsp;&nbsp; 只看结果
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* PAGE 1: SECTION 1 - IDENTITAS KEJADIAN */}
                    {slice.pageNumber === 1 && (
                      <div>
                        <div style={sectionBannerStyle}>
                          1. IDENTITAS KEJADIAN (基本信息)
                        </div>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            fontSize: "9.5px",
                          }}
                        >
                          <colgroup>
                            <col style={{ width: "21%" }} />
                            <col style={{ width: "29%" }} />
                            <col style={{ width: "21%" }} />
                            <col style={{ width: "29%" }} />
                          </colgroup>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                  height: "22px",
                                }}
                              >
                                No. Laporan (报告编号)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 600,
                                }}
                              >
                                {reportNo}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                }}
                              >
                                Tanggal & Waktu (日期与时间)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                }}
                              >
                                {dateTime}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                  height: "22px",
                                }}
                              >
                                Lokasi Kejadian (发生地点)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  wordBreak: "break-word",
                                }}
                              >
                                {incidentLocation}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                }}
                              >
                                Departemen Terkait (责任部门)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  wordBreak: "break-word",
                                }}
                              >
                                {relatedDepartment}
                              </td>
                            </tr>
                            <tr>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                  height: "22px",
                                }}
                              >
                                Tim Investigasi (调查人员)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                }}
                              >
                                {investigationTeam}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 700,
                                }}
                              >
                                Status Laporan (报告状态)
                              </td>
                              <td
                                style={{
                                  border: "1px solid #000000",
                                  padding: "1px 6px 4px 6px",
                                  fontWeight: 600,
                                }}
                              >
                                {reportStatus}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SECTION 2: HASIL INVESTIGASI & PENGUKURAN */}
                    {slice.showSection2Banner && (
                      <div>
                        <div style={sectionBannerStyle}>
                          2. HASIL INVESTIGASI & PENGUKURAN (调查结果与监测数据)
                        </div>

                        {slice.showChronologyHeader && (
                          <>
                            <div style={subHeaderStyle}>
                              1. Kronologi & Uraian Kejadian (事件经过与问题描述)
                              {slice.chronologyContinued
                                ? " (Lanjutan / 续)"
                                : ""}
                            </div>
                            <div
                              style={{
                                border: "1px solid #000000",
                                padding: "4px 8px 7px 8px",
                                minHeight: "64px",
                                fontSize: "10px",
                                lineHeight: 1.4,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {slice.chronologyLines.join("\n")}
                            </div>
                          </>
                        )}

                        {slice.showMeasurements && (
                          <>
                            <div style={subHeaderStyle}>
                              2. Data Pengukuran Lapangan (现场监测数据) — Isi
                              apabila dilakukan pengukuran parameter lingkungan
                            </div>
                            {hasMeasurements ? (
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  tableLayout: "fixed",
                                  fontSize: "9.2px",
                                }}
                              >
                                <colgroup>
                                  <col style={{ width: "24%" }} />
                                  <col style={{ width: "24%" }} />
                                  <col style={{ width: "22%" }} />
                                  <col style={{ width: "30%" }} />
                                </colgroup>
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        border: "1px solid #000000",
                                        padding: "1px 4px 4px 4px",
                                        height: "22px",
                                      }}
                                    >
                                      Parameter Uji (监测参数)
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #000000",
                                        padding: "1px 4px 4px 4px",
                                      }}
                                    >
                                      Hasil Ukur (监测结果)
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #000000",
                                        padding: "1px 4px 4px 4px",
                                      }}
                                    >
                                      Baku Mutu / NAB (标准限值)
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #000000",
                                        padding: "1px 4px 4px 4px",
                                      }}
                                    >
                                      Keterangan / Evaluasi (评估说明)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {measurements.map((row, idx) => (
                                    <tr key={idx}>
                                      <td
                                        style={{
                                          border: "1px solid #000000",
                                          padding: "1px 6px 4px 6px",
                                          height: "22px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {row.parameter}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #000000",
                                          padding: "1px 6px 4px 6px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {row.result}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #000000",
                                          padding: "1px 6px 4px 6px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {row.standard}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #000000",
                                          padding: "1px 6px 4px 6px",
                                          textAlign: "center",
                                        }}
                                      >
                                        {row.evaluation}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div
                                style={{
                                  border: "1px solid #000000",
                                  padding: "2px 8px 5px 8px",
                                  height: "22px",
                                  fontSize: "9.2px",
                                  color: "#475569",
                                  textAlign: "center",
                                  boxSizing: "border-box",
                                }}
                              >
                                Tidak dilakukan pengukuran parameter lingkungan /
                                未进行现场环境参数监测
                              </div>
                            )}
                          </>
                        )}

                        {slice.showRootCauseHeader && (
                          <>
                            <div style={subHeaderStyle}>
                              3. Penyebab Utama / Akar Masalah (根本原因)
                              {slice.rootCauseContinued
                                ? " (Lanjutan / 续)"
                                : ""}
                            </div>
                            <div
                              style={{
                                border: "1px solid #000000",
                                padding: "4px 8px 7px 8px",
                                minHeight: "54px",
                                fontSize: "10px",
                                lineHeight: 1.4,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {slice.rootCauseLines.join("\n")}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* SECTION 3: DOKUMENTASI VISUAL LAPANGAN */}
                    {slice.showVisualSection && (
                      <div>
                        <div style={sectionBannerStyle}>
                          3. DOKUMENTASI VISUAL LAPANGAN (现场影像记录)
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            border: "1px solid #000000",
                          }}
                        >
                          <div style={{ borderRight: "1px solid #000000" }}>
                            <div
                              style={{
                                ...centeredCellBox("22px", "4px"),
                                borderBottom: "1px solid #000000",
                                fontSize: "9.2px",
                                fontWeight: 700,
                              }}
                            >
                              1. Titik Sumber Kejadian (排放/发生源点)
                            </div>
                            {renderVisualBox(
                              sourcePhotos,
                              sourceCaption,
                              "Sumber"
                            )}
                          </div>

                          <div style={{ borderRight: "1px solid #000000" }}>
                            <div
                              style={{
                                ...centeredCellBox("22px", "4px"),
                                borderBottom: "1px solid #000000",
                                fontSize: "9.2px",
                                fontWeight: 700,
                              }}
                            >
                              2. Area Terdampak (受影响区域)
                            </div>
                            {renderVisualBox(
                              impactedPhotos,
                              impactedCaption,
                              "Terdampak"
                            )}
                          </div>

                          <div>
                            <div
                              style={{
                                ...centeredCellBox("22px", "4px"),
                                borderBottom: "1px solid #000000",
                                fontSize: "9.2px",
                                fontWeight: 700,
                              }}
                            >
                              3. Kondisi Pasca-Penanganan (处理后现场状况)
                            </div>
                            {renderVisualBox(
                              postActionPhotos,
                              postActionCaption,
                              "Pasca"
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 4: TINDAK LANJUT & PENGESAHAN */}
                    {(slice.showCapaSection || slice.showApprovalSection) && (
                      <div>
                        <div style={sectionBannerStyle}>
                          4. TINDAK LANJUT & PENGESAHAN (整改措施与审批)
                        </div>

                        {slice.showCapaSection && (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              tableLayout: "fixed",
                              fontSize: "9.2px",
                            }}
                          >
                            <colgroup>
                              <col style={{ width: "6%" }} />
                              <col style={{ width: "44%" }} />
                              <col style={{ width: "18%" }} />
                              <col style={{ width: "16%" }} />
                              <col style={{ width: "16%" }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    border: "1px solid #000000",
                                    padding: "1px 3px 4px 3px",
                                    height: "22px",
                                  }}
                                >
                                  No
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #000000",
                                    padding: "1px 4px 4px 4px",
                                  }}
                                >
                                  Tindakan Perbaikan & Pencegahan
                                  (纠正与预防措施)
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #000000",
                                    padding: "1px 4px 4px 4px",
                                  }}
                                >
                                  PIC (责任人)
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #000000",
                                    padding: "1px 4px 4px 4px",
                                  }}
                                >
                                  Target Selesai (完成期限)
                                </th>
                                <th
                                  style={{
                                    border: "1px solid #000000",
                                    padding: "1px 4px 4px 4px",
                                  }}
                                >
                                  Status (状态)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {capaRows.map((row, idx) => (
                                <tr key={idx}>
                                  <td
                                    style={{
                                      border: "1px solid #000000",
                                      padding: "1px 3px 4px 3px",
                                      textAlign: "center",
                                      fontWeight: 700,
                                      height: "22px",
                                    }}
                                  >
                                    {idx + 1}
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #000000",
                                      padding: "1px 6px 4px 6px",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {row.action}
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #000000",
                                      padding: "1px 4px 4px 4px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {row.pic}
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #000000",
                                      padding: "1px 4px 4px 4px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {row.targetDate}
                                  </td>
                                  <td
                                    style={{
                                      border: "1px solid #000000",
                                      padding: "1px 4px 4px 4px",
                                      textAlign: "center",
                                    }}
                                  >
                                    {row.status}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {slice.showApprovalSection && (
                          <div style={{ border: "1px solid #000000" }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                borderBottom: "1px solid #000000",
                                fontSize: "9.5px",
                                fontWeight: 700,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("22px", "4px"),
                                  borderRight: "1px solid #000000",
                                }}
                              >
                                Dibuat Oleh (编制人)
                              </div>
                              <div
                                style={{
                                  ...centeredCellBox("22px", "4px"),
                                  borderRight: "1px solid #000000",
                                }}
                              >
                                Diperiksa Oleh (审核人)
                              </div>
                              <div style={centeredCellBox("22px", "4px")}>
                                Disetujui Oleh (批准人)
                              </div>
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                              }}
                            >
                              {renderSignOffColumn(preparedBy, false)}
                              {renderSignOffColumn(checkedBy, false)}
                              {renderSignOffColumn(approvedBy, true)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 (BOTTOM): Riwayat Laporan Investigasi 100% Supabase */}
        <section className="bg-white rounded-2xl border border-[#5DA295]/25 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#5DA295]" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Riwayat Laporan Investigasi (Supabase Cloud) / 云端已保存调查报告 (
                {filteredHistory.length})
              </h3>
              <button
                type="button"
                onClick={() => fetchFromSupabase(false)}
                disabled={loadingCloud}
                title="Muat ulang data dari Supabase"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loadingCloud ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. laporan / lokasi... / 搜索报告编号..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
              />
            </div>
          </div>

          {loadingCloud && filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Mengambil data dari database Supabase... / 正在从云端加载记录...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada laporan investigasi di database Supabase. Klik
              &ldquo;Simpan ke Supabase / 保存到云端&rdquo; untuk menyimpan. /
              云端暂无保存记录。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFFDF8] border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-bold">
                      No. Laporan / 报告编号
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Tanggal & Waktu / 日期与时间
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Lokasi Kejadian / 发生地点
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Status / 报告状态
                    </th>
                    <th className="py-3 px-4 font-bold text-right">
                      Aksi / 操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FFFDF8]">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.reportNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.dateTime}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.incidentLocation || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {item.reportStatus}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => loadRecord(item)}
                          className="px-2.5 py-1 rounded-lg bg-[#5DA295]/15 hover:bg-[#5DA295]/25 text-[#3e776c] font-semibold cursor-pointer"
                        >
                          Muat / 加载
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecord(item)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold cursor-pointer"
                        >
                          Hapus / 删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}