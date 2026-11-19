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
  RefreshCw,
  FolderOpen,
  ChevronDown,
  X,
  RotateCcw,
  Cloud,
  CloudOff,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import TopNavHeader from "../components/TopNavHeader";
import { supabase, uploadPhotoToSupabase } from "../lib/supabase";

type UrgencyLevel = "urgent" | "medium" | "normal";

interface SupervisorOption {
  id: string;
  name: string;
  signatureUrl: string;
}

interface DivisionOption {
  id: string;
  zh: string;
}

interface RectificationRecord {
  id: string;
  docSeq: string;
  revNo: string;
  issueDate: string;
  inspectedUnit: string;
  picName: string;
  inspectors: string[];
  inspectionDate: string;
  urgency: UrgencyLevel;
  deadline: string;
  hazardDescription: string;
  rectificationRecommendation: string;
  beforePhotos: string[];
  afterPhotos: string[];
  approvedById: string;
  checkedById: string;
  createdAt: string;
}

interface PageSlice {
  pageNumber: number;
  hazardLines: string[];
  showHazardHeader: boolean;
  hazardContinued: boolean;
  recLines: string[];
  showRecHeader: boolean;
  recContinued: boolean;
  showSection1: boolean;
  section1ContinuedOnly: boolean;
  showBeforePhotos: boolean;
  showAfterPhotos: boolean;
  showSection2: boolean;
  section2ContinuedOnly: boolean;
  showFooter: boolean;
}

const DOC_PREFIX = "QMB-FRM-ENV-TIL-002-";
const FIXED_REV_NO = "00";
const FIXED_ISSUE_DATE = "2026.09.15";

const SUPERVISOR_OPTIONS: SupervisorOption[] = [
  {
    id: "bian-yuandong",
    name: "BIAN YUANDONG / 卞远东",
    signatureUrl: "/signatures/bian.yuandong.png",
  },
  {
    id: "rao-youqing",
    name: "RAO YOUQING / 饶友清",
    signatureUrl: "/signatures/rao.youqing.png",
  },
];

const INSPECTOR_OPTIONS = ["陈晓旭", "卡尔迪"];

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

const STORAGE_KEY = "qmb_env_til_002_history_v4";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const A4_PADDING_Y = 24;
const A4_PADDING_X = 26;
const PRINTABLE_HEIGHT = A4_HEIGHT_PX - A4_PADDING_Y * 2;

const HEADER_BLOCK_HEIGHT = 154;
const METADATA_BLOCK_HEIGHT = 100;
const FOOTER_BLOCK_HEIGHT = 92;
const SUBHEADER_HEIGHT = 28;
const PHOTO_BOX_HEIGHT = 156;

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDotDate(isoDate: string): string {
  if (!isoDate) return "";
  return isoDate.replace(/-/g, ".");
}

function addDaysToIso(dateStr: string, days: number): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  base.setDate(base.getDate() + days);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatSeq(num: number): string {
  return String(num).padStart(3, "0");
}

function getNextSeqFromRecords(records: RectificationRecord[]): string {
  if (records.length === 0) return "001";
  const maxNum = records.reduce((max, item) => {
    const parsed = parseInt(item.docSeq, 10);
    return !Number.isNaN(parsed) && parsed > max ? parsed : max;
  }, 0);
  return formatSeq(maxNum + 1);
}

export default function QmbEnvRectificationPage() {
  const [copiedWeChat, setCopiedWeChat] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(
    Boolean(supabase)
  );
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [sigErrors, setSigErrors] = useState<Record<string, boolean>>({});

  const [docSeq, setDocSeq] = useState<string>("001");
  const revNo = FIXED_REV_NO;
  const issueDate = FIXED_ISSUE_DATE;

  const [inspectedUnit, setInspectedUnit] = useState<string>("");
  const [unitDropdownOpen, setUnitDropdownOpen] = useState<boolean>(false);
  const [unitSearch, setUnitSearch] = useState<string>("");

  const [picName, setPicName] = useState<string>("");
  const [selectedInspectors, setSelectedInspectors] = useState<string[]>([]);
  const [inspectionDate, setInspectionDate] = useState<string>(getTodayIso());
  const [urgency, setUrgency] = useState<UrgencyLevel>("urgent");
  const [deadline, setDeadline] = useState<string>(addDaysToIso(getTodayIso(), 1));

  const [hazardDescription, setHazardDescription] = useState<string>("");
  const [rectificationRecommendation, setRectificationRecommendation] =
    useState<string>("");

  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

  const [approvedById, setApprovedById] = useState<string>("");
  const [checkedById, setCheckedById] = useState<string>("");

  const [history, setHistory] = useState<RectificationRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  const [pages, setPages] = useState<PageSlice[]>([
    {
      pageNumber: 1,
      hazardLines: [],
      showHazardHeader: true,
      hazardContinued: false,
      recLines: [],
      showRecHeader: true,
      recContinued: false,
      showSection1: true,
      section1ContinuedOnly: false,
      showBeforePhotos: true,
      showAfterPhotos: true,
      showSection2: true,
      section2ContinuedOnly: false,
      showFooter: true,
    },
  ]);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hazardMeasureRef = useRef<HTMLDivElement>(null);
  const recMeasureRef = useRef<HTMLDivElement>(null);
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  const fullDocCode = `${DOC_PREFIX}${docSeq || "001"}`;
  const approvedSupervisor = SUPERVISOR_OPTIONS.find(
    (s) => s.id === approvedById
  );
  const checkedSupervisor = SUPERVISOR_OPTIONS.find(
    (s) => s.id === checkedById
  );
  const inspectorDisplay = selectedInspectors.join(", ");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        unitDropdownRef.current &&
        !unitDropdownRef.current.contains(event.target as Node)
      ) {
        setUnitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const syncFromSupabase = useCallback(
    async (localRecords: RectificationRecord[]) => {
      if (!supabase) {
        setCloudConnected(false);
        return;
      }

      setLoadingCloud(true);
      try {
        const { data, error } = await supabase
          .from("rectification_reports")
          .select("id, doc_no, payload, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setCloudConnected(true);

        const cloudRecords: RectificationRecord[] = (data || [])
          .map((row) => {
            const payload = row.payload as RectificationRecord | null;
            if (!payload) return null;
            return {
              ...payload,
              id: row.id || payload.id,
            };
          })
          .filter((item): item is RectificationRecord => item !== null);

        const cloudDocSeqs = new Set(cloudRecords.map((r) => r.docSeq));
        const localOnly = localRecords.filter(
          (r) => !cloudDocSeqs.has(r.docSeq)
        );
        const merged = [...cloudRecords, ...localOnly];

        setHistory(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setDocSeq(getNextSeqFromRecords(merged));
      } catch (err) {
        console.error("Supabase fetch rectification error:", err);
        setCloudConnected(false);
      } finally {
        setLoadingCloud(false);
      }
    },
    []
  );

  useEffect(() => {
    let parsedLocal: RectificationRecord[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        parsedLocal = JSON.parse(raw);
        setHistory(parsedLocal);
        setDocSeq(getNextSeqFromRecords(parsedLocal));
      } else {
        setDocSeq("001");
      }
    } catch {
      setDocSeq("001");
    }

    syncFromSupabase(parsedLocal);
  }, [syncFromSupabase]);

  const computePagination = useCallback(() => {
    const rawHazardLines = hazardDescription
      ? hazardDescription.split("\n")
      : [];
    const rawRecLines = rectificationRecommendation
      ? rectificationRecommendation.split("\n")
      : [];

    const measureLineHeights = (
      container: HTMLDivElement | null,
      lines: string[]
    ): number[] => {
      if (!container || lines.length === 0) return [];
      const children = Array.from(container.children) as HTMLElement[];
      return lines.map((_, idx) => {
        const el = children[idx];
        return el ? Math.ceil(el.getBoundingClientRect().height) : 18;
      });
    };

    const hazardHeights = measureLineHeights(
      hazardMeasureRef.current,
      rawHazardLines
    );
    const recHeights = measureLineHeights(recMeasureRef.current, rawRecLines);

    const beforeBlockH = SUBHEADER_HEIGHT + PHOTO_BOX_HEIGHT;
    const afterBlockH = SUBHEADER_HEIGHT + PHOTO_BOX_HEIGHT;

    const builtPages: PageSlice[] = [];
    let pageNum = 1;
    let hIdx = 0;
    let rIdx = 0;
    let beforeDone = false;
    let afterDone = false;

    const getAvailableBodyHeight = (pNum: number) => {
      return pNum === 1
        ? PRINTABLE_HEIGHT - HEADER_BLOCK_HEIGHT - METADATA_BLOCK_HEIGHT
        : PRINTABLE_HEIGHT - HEADER_BLOCK_HEIGHT;
    };

    while (
      (hIdx < rawHazardLines.length ||
        rIdx < rawRecLines.length ||
        !beforeDone ||
        !afterDone ||
        builtPages.length === 0) &&
      pageNum <= 15
    ) {
      const maxBodyH = getAvailableBodyHeight(pageNum);
      let usedH = 0;

      const slice: PageSlice = {
        pageNumber: pageNum,
        hazardLines: [],
        showHazardHeader: false,
        hazardContinued: false,
        recLines: [],
        showRecHeader: false,
        recContinued: false,
        showSection1: false,
        section1ContinuedOnly: pageNum > 1,
        showBeforePhotos: false,
        showAfterPhotos: false,
        showSection2: false,
        section2ContinuedOnly: false,
        showFooter: false,
      };

      if (
        hIdx < rawHazardLines.length ||
        (pageNum === 1 && rawHazardLines.length === 0)
      ) {
        slice.showSection1 = true;
        slice.showHazardHeader = true;
        slice.hazardContinued = hIdx > 0;
        usedH += SUBHEADER_HEIGHT + 18;

        if (rawHazardLines.length === 0) {
          usedH += 64;
        } else {
          while (hIdx < rawHazardLines.length) {
            const lineH = hazardHeights[hIdx] || 18;
            if (
              usedH + lineH <= maxBodyH - 20 ||
              slice.hazardLines.length === 0
            ) {
              slice.hazardLines.push(rawHazardLines[hIdx]);
              usedH += lineH;
              hIdx++;
            } else {
              break;
            }
          }
          if (usedH < SUBHEADER_HEIGHT + 64) {
            usedH = SUBHEADER_HEIGHT + 64;
          }
        }
      }

      if (
        hIdx >= rawHazardLines.length &&
        (rIdx < rawRecLines.length ||
          (pageNum === 1 && rawRecLines.length === 0))
      ) {
        const neededHeader = SUBHEADER_HEIGHT + 36;
        if (usedH + neededHeader <= maxBodyH) {
          slice.showSection1 = true;
          slice.showRecHeader = true;
          slice.recContinued = rIdx > 0;
          usedH += SUBHEADER_HEIGHT + 18;

          if (rawRecLines.length === 0) {
            usedH += 64;
          } else {
            while (rIdx < rawRecLines.length) {
              const lineH = recHeights[rIdx] || 18;
              if (
                usedH + lineH <= maxBodyH - 20 ||
                slice.recLines.length === 0
              ) {
                slice.recLines.push(rawRecLines[rIdx]);
                usedH += lineH;
                rIdx++;
              } else {
                break;
              }
            }
            if (usedH < SUBHEADER_HEIGHT + 64) {
              usedH = SUBHEADER_HEIGHT + 64;
            }
          }
        }
      }

      if (
        hIdx >= rawHazardLines.length &&
        rIdx >= rawRecLines.length &&
        !beforeDone
      ) {
        if (usedH + beforeBlockH <= maxBodyH) {
          slice.showSection2 = true;
          slice.showBeforePhotos = true;
          usedH += beforeBlockH;
          beforeDone = true;
        }
      }

      if (
        hIdx >= rawHazardLines.length &&
        rIdx >= rawRecLines.length &&
        beforeDone &&
        !afterDone
      ) {
        if (usedH + afterBlockH <= maxBodyH) {
          slice.showSection2 = true;
          if (!slice.showBeforePhotos) {
            slice.section2ContinuedOnly = true;
          }
          slice.showAfterPhotos = true;
          usedH += afterBlockH;
          afterDone = true;
        }
      }

      const allContentDone =
        hIdx >= rawHazardLines.length &&
        rIdx >= rawRecLines.length &&
        beforeDone &&
        afterDone;

      if (allContentDone && usedH + FOOTER_BLOCK_HEIGHT <= maxBodyH) {
        slice.showFooter = true;
        builtPages.push(slice);
        break;
      }

      builtPages.push(slice);
      pageNum++;
    }

    setPages(builtPages);
  }, [hazardDescription, rectificationRecommendation]);

  useLayoutEffect(() => {
    computePagination();
  }, [computePagination, beforePhotos, afterPhotos]);

  const toggleInspector = (name: string) => {
    setSelectedInspectors((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleUrgencyChange = (newUrgency: UrgencyLevel) => {
    setUrgency(newUrgency);
    const days = newUrgency === "urgent" ? 1 : newUrgency === "medium" ? 3 : 7;
    setDeadline(addDaysToIso(inspectionDate, days));
  };

  const handleInspectionDateChange = (newDate: string) => {
    setInspectionDate(newDate);
    const days = urgency === "urgent" ? 1 : urgency === "medium" ? 3 : 7;
    setDeadline(addDaysToIso(newDate, days));
  };

  const regenerateDocSeq = () => {
    const seq = Math.floor(Math.random() * 899) + 100;
    setDocSeq(formatSeq(seq));
  };

  const fillSampleData = () => {
    const today = getTodayIso();
    setInspectedUnit("");
    setPicName("");
    setSelectedInspectors(["陈晓旭", "卡尔迪"]);
    setInspectionDate(today);
    setUrgency("urgent");
    setDeadline(addDaysToIso(today, 1));
    setHazardDescription(
      "1. Ditemukan rembesan slurry asam pada sambungan flange pompa P-204B di area Netralisasi Line 2 yang mengalir menuju saluran drainase air hujan.\n1. 发现湿法二线中和区P-204B输送泵法兰连接处存在酸性矿浆渗漏，渗漏液正流向雨水排水沟。"
    );
    setRectificationRecommendation(
      "1. Segera alihkan operasi ke pompa cadangan dan ganti gasket flange yang bocor.\n2. Bersihkan seluruh ceceran slurry di area tanggul penampung (bundwall) dan pastikan saluran air hujan tertutup rapat.\n1. 立即切换至备用泵并更换破损法兰垫片。\n2. 彻底清理围堰内残留矿浆，确保雨水沟封堵严密。"
    );
    setSigErrors({});
    setApprovedById("rao-youqing");
    setCheckedById("bian-yuandong");
  };

  const resetForm = () => {
    const today = getTodayIso();
    setDocSeq(getNextSeqFromRecords(history));
    setInspectedUnit("");
    setUnitSearch("");
    setPicName("");
    setSelectedInspectors([]);
    setInspectionDate(today);
    setUrgency("urgent");
    setDeadline(addDaysToIso(today, 1));
    setHazardDescription("");
    setRectificationRecommendation("");
    setBeforePhotos([]);
    setAfterPhotos([]);
    setSigErrors({});
    setApprovedById("");
    setCheckedById("");
  };

  const processImageUpload = (
    files: FileList | null,
    currentList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (!files || files.length === 0) return;
    const remainingSlots = 3 - currentList.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 900;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL("image/jpeg", 0.78);
            setter((prev) => (prev.length < 3 ? [...prev, compressed] : prev));
          }
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveToHistory = async () => {
    if (!inspectedUnit.trim() || !hazardDescription.trim()) {
      alert(
        "Mohon isi minimal Unit yang Diperiksa dan Deskripsi Bahaya sebelum menyimpan. / 保存前请至少填写受检单位和隐患描述。"
      );
      return;
    }

    setSaving(true);
    const cleanSeq = docSeq.trim() || "001";
    const docNo = `${DOC_PREFIX}${cleanSeq}`;

    let finalBeforePhotos = [...beforePhotos];
    let finalAfterPhotos = [...afterPhotos];

    if (supabase) {
      try {
        finalBeforePhotos = await Promise.all(
          beforePhotos.map((src) =>
            uploadPhotoToSupabase(src, "rectification")
          )
        );
        finalAfterPhotos = await Promise.all(
          afterPhotos.map((src) =>
            uploadPhotoToSupabase(src, "rectification")
          )
        );
        setBeforePhotos(finalBeforePhotos);
        setAfterPhotos(finalAfterPhotos);
      } catch (uploadErr) {
        console.warn("Gagal mengunggah foto ke Storage, menyimpan cadangan lokal:", uploadErr);
      }
    }

    const existingItem = history.find((item) => item.docSeq === cleanSeq);
    const newRecord: RectificationRecord = {
      id:
        existingItem?.id ||
        (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      docSeq: cleanSeq,
      revNo,
      issueDate,
      inspectedUnit,
      picName,
      inspectors: selectedInspectors,
      inspectionDate,
      urgency,
      deadline,
      hazardDescription,
      rectificationRecommendation,
      beforePhotos: finalBeforePhotos,
      afterPhotos: finalAfterPhotos,
      approvedById,
      checkedById,
      createdAt: existingItem?.createdAt || new Date().toISOString(),
    };

    const localUpdated = [
      newRecord,
      ...history.filter((item) => item.docSeq !== cleanSeq),
    ];
    setHistory(localUpdated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localUpdated));

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("rectification_reports")
          .upsert(
            {
              doc_no: docNo,
              unit_area: inspectedUnit,
              inspection_date: inspectionDate,
              status: urgency,
              payload: newRecord,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "doc_no" }
          )
          .select("id")
          .single();

        if (error) throw error;

        if (data?.id) {
          newRecord.id = data.id;
          const syncedList = [
            newRecord,
            ...history.filter((item) => item.docSeq !== cleanSeq),
          ];
          setHistory(syncedList);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedList));
        }

        setCloudConnected(true);
        setSavedToast("Tersimpan ke Cloud! / 已保存到云端！");
      } catch (dbErr) {
        console.error("Supabase save rectification error:", dbErr);
        setCloudConnected(false);
        setSavedToast("Tersimpan di Lokal / 已本地保存");
      }
    } else {
      setSavedToast("Tersimpan di Lokal / 已本地保存");
    }

    setSaving(false);
    setTimeout(() => setSavedToast(null), 3000);
  };

  const loadRecord = (rec: RectificationRecord) => {
    setDocSeq(rec.docSeq || "001");
    setInspectedUnit(rec.inspectedUnit);
    setPicName(rec.picName);
    setSelectedInspectors(rec.inspectors || []);
    setInspectionDate(rec.inspectionDate);
    setUrgency(rec.urgency);
    setDeadline(rec.deadline);
    setHazardDescription(rec.hazardDescription);
    setRectificationRecommendation(rec.rectificationRecommendation);
    setBeforePhotos(rec.beforePhotos || []);
    setAfterPhotos(rec.afterPhotos || []);
    setSigErrors({});
    setApprovedById(rec.approvedById || "");
    setCheckedById(rec.checkedById || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (rec: RectificationRecord) => {
    const updated = history.filter((item) => item.docSeq !== rec.docSeq);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (supabase) {
      try {
        const docNo = `${DOC_PREFIX}${rec.docSeq}`;
        const { error } = await supabase
          .from("rectification_reports")
          .delete()
          .eq("doc_no", docNo);

        if (error) throw error;
        setCloudConnected(true);
      } catch (err) {
        console.error("Supabase delete rectification error:", err);
        setCloudConnected(false);
      }
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
        link.download = `${fullDocCode}${suffix}.png`;
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
      const a4WidthMm = 210;
      const a4HeightMm = 297;

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
        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "PNG", 0, 0, a4WidthMm, a4HeightMm);
      }

      pdf.save(`${fullDocCode}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Gagal mengekspor PDF. / PDF导出失败。");
    } finally {
      setExporting(null);
    }
  };

  const handleCopyWeChat = () => {
    const msg = `【PT QMB - SURAT PERMOHONAN PERBAIKAN SARANA / 环保隐患整改通知单】
Kode / 代码: ${fullDocCode}
Unit yang Diperiksa / 受检单位: ${inspectedUnit || "-"}
Penanggung Jawab / 责任人: ${picName || "-"}
Pemeriksa / 检查人: ${inspectorDisplay || "-"}
Tanggal Inspeksi / 检查日期: ${formatDotDate(inspectionDate)}
Tenggat Waktu / 整改期限: ${formatDotDate(deadline)}

1. Deskripsi Bahaya / 隐患描述:
${hazardDescription || "-"}

2. Rekomendasi Perbaikan / 整改要求:
${rectificationRecommendation || "-"}

马上行动 不找借口 不讲理由 只看结果
Mohon segera ditindaklanjuti sebelum tenggat waktu. / 请责任单位按期完成整改。`;

    navigator.clipboard.writeText(msg);
    setCopiedWeChat(true);
    setTimeout(() => setCopiedWeChat(false), 2500);
  };

  const filteredDivisions = DIVISION_LIST.filter((div) => {
    const q = unitSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      div.id.toLowerCase().includes(q) || div.zh.toLowerCase().includes(q)
    );
  });

  const filteredHistory = history.filter((item) => {
    const matchUrgency =
      urgencyFilter === "all" || item.urgency === urgencyFilter;
    const q = searchQuery.toLowerCase();
    const codeStr = `${DOC_PREFIX}${item.docSeq}`.toLowerCase();
    const matchSearch =
      !q ||
      codeStr.includes(q) ||
      item.inspectedUnit.toLowerCase().includes(q) ||
      item.picName.toLowerCase().includes(q) ||
      item.hazardDescription.toLowerCase().includes(q);
    return matchUrgency && matchSearch;
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
    paddingTop: "2px",
    paddingBottom: "8px",
    paddingLeft: horizontalPadding,
    paddingRight: horizontalPadding,
    textAlign: "center",
    lineHeight: 1.3,
  });

  const subHeaderBox: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    minHeight: `${SUBHEADER_HEIGHT}px`,
    paddingTop: "2px",
    paddingBottom: "7px",
    paddingLeft: "10px",
    paddingRight: "10px",
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: 1.25,
  };

  const totalPages = pages.length;

  const renderFormattedUnit = (unitText: string) => {
    if (!unitText) return null;
    if (unitText.includes(" / ")) {
      const [topPart, bottomPart] = unitText.split(" / ");
      return (
        <>
          <span
            style={{
              fontSize: "8.5px",
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {topPart}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              marginTop: "2px",
            }}
          >
            {bottomPart}
          </span>
        </>
      );
    }
    return <span>{unitText}</span>;
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8] text-slate-800 pb-16">
      {/* Hidden DOM Line-Height Measurer */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "676px",
          fontFamily: '"Times New Roman", "SimSun", "Microsoft YaHei", serif',
          fontSize: "11.5px",
          lineHeight: 1.55,
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <div ref={hazardMeasureRef}>
          {(hazardDescription ? hazardDescription.split("\n") : []).map(
            (line, i) => (
              <div
                key={i}
                style={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  minHeight: "18px",
                }}
              >
                {line || " "}
              </div>
            )
          )}
        </div>
        <div ref={recMeasureRef}>
          {(rectificationRecommendation
            ? rectificationRecommendation.split("\n")
            : []
          ).map((line, i) => (
            <div
              key={i}
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "18px",
              }}
            >
              {line || " "}
            </div>
          ))}
        </div>
      </div>

      {/* Shared Sticky Top Bar */}
      <TopNavHeader />

      {/* Main Vertical Stacked Workspace */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* SECTION 1 (TOP): Input Form */}
        <section className="bg-white rounded-2xl border border-[#5DA295]/25 shadow-sm overflow-visible">
          <div className="bg-[#5DA295] px-5 py-4 text-white rounded-t-2xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <h2 className="font-bold text-sm sm:text-base">
                Input Data Permohonan / 整改通知单录入
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

          <div className="p-5 space-y-4">
            {/* Group 1: Kontrol Dokumen */}
            <div className="p-3.5 rounded-xl bg-[#FFFDF8] border border-[#5DA295]/25 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3e776c]">
                  Kontrol Dokumen / 文件控制信息
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    cloudConnected
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
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
                      Mode Lokal (Offline)
                    </>
                  )}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode / 代码 (Edit Nomor Urut: 001, 002, dst.)
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center w-full rounded-lg border border-slate-300 overflow-hidden bg-slate-100">
                    <span className="px-3 py-2 text-xs font-mono font-semibold text-slate-600 bg-slate-100 select-none shrink-0 border-r border-slate-300">
                      {DOC_PREFIX}
                    </span>
                    <input
                      type="text"
                      value={docSeq}
                      onChange={(e) => setDocSeq(e.target.value)}
                      placeholder="001"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-amber-50/80 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={regenerateDocSeq}
                    title="Generate Nomor Urut Baru / 生成新序号"
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Group 2: Unit yang Diperiksa & Penanggung Jawab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={unitDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit yang Diperiksa / 受检单位
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    autoComplete="off"
                    value={inspectedUnit}
                    onFocus={() => setUnitDropdownOpen(true)}
                    onChange={(e) => setInspectedUnit(e.target.value)}
                    placeholder="Pilih divisi atau ketik manual..."
                    className="w-full pl-3 pr-14 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                  />
                  {inspectedUnit && (
                    <button
                      type="button"
                      onClick={() => setInspectedUnit("")}
                      title="Hapus / 清空"
                      className="absolute right-7 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setUnitDropdownOpen((prev) => !prev)}
                    title="Buka Daftar Divisi / 展开车间列表"
                    className="absolute right-2 p-1 text-slate-500 hover:text-[#5DA295] cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        unitDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {unitDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl z-40 overflow-hidden">
                    <div className="p-2 bg-[#FFFDF8] border-b border-slate-200">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={unitSearch}
                          onChange={(e) => setUnitSearch(e.target.value)}
                          placeholder="Cari divisi / 搜索车间..."
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#5DA295]"
                        />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {filteredDivisions.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-slate-500">
                          Tidak ditemukan. Anda tetap bisa mengetik manual di
                          kolom atas.
                        </div>
                      ) : (
                        filteredDivisions.map((div, idx) => {
                          const combined = `${div.id} / ${div.zh}`;
                          const isSelected = inspectedUnit === combined;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInspectedUnit(combined);
                                setUnitDropdownOpen(false);
                                setUnitSearch("");
                              }}
                              className={`w-full px-3 py-2 text-center hover:bg-[#5DA295]/10 transition cursor-pointer flex flex-col items-center justify-center ${
                                isSelected ? "bg-[#5DA295]/15" : ""
                              }`}
                            >
                              <span className="text-xs font-bold text-slate-900 leading-tight">
                                {div.id}
                              </span>
                              <span className="text-[11px] font-medium text-slate-600 leading-tight mt-0.5">
                                {div.zh}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penanggung Jawab / 责任人
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  placeholder="Isi manual nama PIC / 手动输入责任人"
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pemeriksa / 检查人 (Pilih 1 atau Keduanya)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INSPECTOR_OPTIONS.map((name) => {
                    const active = selectedInspectors.includes(name);
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleInspector(name)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          active
                            ? "bg-[#5DA295] text-white border-[#5DA295] shadow-xs"
                            : "bg-[#FFFDF8] text-slate-700 border-slate-300 hover:border-[#5DA295]"
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] ${
                            active
                              ? "bg-white text-[#5DA295] border-white"
                              : "border-slate-400 bg-white"
                          }`}
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Inspeksi / 检查日期
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => handleInspectionDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>
            </div>

            {/* Group 3: Urgency Helper & Tenggat Waktu */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilihan Cepat Tenggat / 期限快捷选择
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUrgencyChange("urgent")}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      urgency === "urgent"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-[#FFFDF8] text-slate-700 border-slate-300 hover:border-rose-400"
                    }`}
                  >
                    24 Jam / 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUrgencyChange("medium")}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      urgency === "medium"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[#FFFDF8] text-slate-700 border-slate-300 hover:border-amber-400"
                    }`}
                  >
                    3 Hari / 3天
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUrgencyChange("normal")}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      urgency === "normal"
                        ? "bg-[#5DA295] text-white border-[#5DA295]"
                        : "bg-[#FFFDF8] text-slate-700 border-slate-300 hover:border-[#5DA295]"
                    }`}
                  >
                    7 Hari / 7天
                  </button>
                </div>
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tenggat Waktu / 整改期限
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50/60 border border-rose-200 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>
            </div>

            {/* Group 4: Section 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1A. Deskripsi Bahaya / 隐患描述
                </label>
                <textarea
                  rows={4}
                  value={hazardDescription}
                  onChange={(e) => setHazardDescription(e.target.value)}
                  placeholder="Tuliskan deskripsi bahaya/temuan dalam Bahasa Indonesia & 中文..."
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1B. Rekomendasi Perbaikan / 整改要求
                </label>
                <textarea
                  rows={4}
                  value={rectificationRecommendation}
                  onChange={(e) =>
                    setRectificationRecommendation(e.target.value)
                  }
                  placeholder="Tuliskan rekomendasi tindakan perbaikan dalam Bahasa Indonesia & 中文..."
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>
            </div>

            {/* Group 5: Section 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Dokumentasi Temuan / 发现照片
                  </label>
                  <span className="text-[11px] font-semibold text-[#3e776c]">
                    {beforePhotos.length}/3
                  </span>
                </div>
                {beforePhotos.length < 3 && (
                  <label className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 border-2 border-dashed border-[#5DA295]/40 rounded-xl bg-[#FFFDF8] hover:bg-[#5DA295]/5 text-xs font-medium text-[#3e776c] cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Temuan / 上传发现照</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        processImageUpload(
                          e.target.files,
                          beforePhotos,
                          setBeforePhotos
                        );
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {beforePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {beforePhotos.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                      >
                        <img
                          src={src}
                          alt={`Temuan ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBeforePhotos((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-1 right-1 p-0.5 rounded bg-rose-600 text-white shadow cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Dokumentasi Perbaikan / 整改后照片
                  </label>
                  <span className="text-[11px] font-semibold text-slate-600">
                    {afterPhotos.length}/3
                  </span>
                </div>
                {afterPhotos.length < 3 && (
                  <label className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 border-2 border-dashed border-slate-300 rounded-xl bg-[#FFFDF8] hover:bg-slate-100 text-xs font-medium text-slate-600 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Perbaikan / 上传整改照</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        processImageUpload(
                          e.target.files,
                          afterPhotos,
                          setAfterPhotos
                        );
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {afterPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {afterPhotos.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100"
                      >
                        <img
                          src={src}
                          alt={`Perbaikan ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAfterPhotos((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute top-1 right-1 p-0.5 rounded bg-rose-600 text-white shadow cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Group 6: Approval Supervisor Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disetujui / 核准人
                </label>
                <select
                  value={approvedById}
                  onChange={(e) => {
                    const val = e.target.value;
                    setApprovedById(val);
                    if (val) {
                      setSigErrors((prev) => ({ ...prev, [val]: false }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                >
                  <option value="">-- Kosong / TTD Basah (留空) --</option>
                  {SUPERVISOR_OPTIONS.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diperiksa / 审验人
                </label>
                <select
                  value={checkedById}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCheckedById(val);
                    if (val) {
                      setSigErrors((prev) => ({ ...prev, [val]: false }));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                >
                  <option value="">-- Kosong / TTD Basah (留空) --</option>
                  {SUPERVISOR_OPTIONS.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 (BELOW INPUT FORM): Official Multi-Page Preview */}
        <section className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-[#5DA295]/25 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveToHistory}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5DA295] hover:bg-[#4c8b7f] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
            >
              {savedToast ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving
                ? "Menyimpan ke Cloud... / 正在保存..."
                : savedToast
                ? savedToast
                : "Simpan ke Riwayat / 保存记录"}
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
                  <span>{fullDocCode}</span>
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
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1.5px solid #000000",
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: "5.5%" }} />
                      <col style={{ width: "6.5%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "17%" }} />
                    </colgroup>

                    <tbody>
                      {/* HEADER ROWS */}
                      <tr>
                        <td
                          colSpan={3}
                          rowSpan={2}
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div style={centeredCellBox("62px", "6px")}>
                            {!logoError ? (
                              <img
                                src="/qmb-logo.png"
                                alt="PT QMB Logo"
                                onError={() => setLogoError(true)}
                                style={{
                                  maxWidth: "145px",
                                  maxHeight: "48px",
                                  width: "auto",
                                  height: "auto",
                                  objectFit: "contain",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  lineHeight: 1.15,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 700,
                                    color: "#16a34a",
                                    fontFamily: "Arial, sans-serif",
                                  }}
                                >
                                  Green for a better World
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      fontWeight: 900,
                                      color: "#008566",
                                      fontFamily: "Arial, sans-serif",
                                    }}
                                  >
                                    Q<span style={{ color: "#e11d48" }}>M</span>B
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "15px",
                                      fontWeight: 900,
                                      color: "#0284c7",
                                      fontFamily:
                                        '"Microsoft YaHei", sans-serif',
                                    }}
                                  >
                                    青美邦
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "8.5px",
                                    fontWeight: 700,
                                    color: "#15803d",
                                    fontFamily:
                                      '"Microsoft YaHei", sans-serif',
                                  }}
                                >
                                  青山绿水 美丽世界
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td
                          colSpan={4}
                          rowSpan={2}
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div style={centeredCellBox("62px", "6px")}>
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: 700,
                                letterSpacing: "1px",
                                marginBottom: "3px",
                              }}
                            >
                              青美邦新能源材料有限公司
                            </div>
                            <div
                              style={{
                                fontSize: "13.5px",
                                fontWeight: 700,
                              }}
                            >
                              PT QMB New Energy Materials Co., Ltd.
                            </div>
                          </div>
                        </td>

                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "3px"),
                              fontSize: "10.5px",
                            }}
                          >
                            Kode 代码
                          </div>
                        </td>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "2px"),
                              fontSize: "8.8px",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fullDocCode}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "3px"),
                              fontSize: "10.5px",
                            }}
                          >
                            No. Rev 修订
                          </div>
                        </td>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "3px"),
                              fontSize: "10.5px",
                            }}
                          >
                            {revNo}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={7}
                          rowSpan={2}
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div style={centeredCellBox("62px", "6px")}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                marginBottom: "3px",
                              }}
                            >
                              SURAT PERMOHONAN PERBAIKAN SARANA
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                letterSpacing: "1px",
                              }}
                            >
                              环保隐患整改通知单
                            </div>
                          </div>
                        </td>

                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("31px", "2px"),
                              fontSize: "10px",
                            }}
                          >
                            Tgl. Terbit 签发日期
                          </div>
                        </td>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("31px", "3px"),
                              fontSize: "10.5px",
                            }}
                          >
                            {issueDate}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "3px"),
                              fontSize: "10.5px",
                            }}
                          >
                            Halaman 页
                          </div>
                        </td>
                        <td
                          style={{
                            border: "1px solid #000000",
                            padding: 0,
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("30px", "3px"),
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            {slice.pageNumber} dari {totalPages}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            backgroundColor: "#000000",
                            color: "#ffffff",
                            padding: 0,
                            border: "1px solid #000000",
                          }}
                        >
                          <div
                            style={{
                              ...centeredCellBox("26px", "8px"),
                              fontWeight: 700,
                              fontSize: "11.5px",
                              letterSpacing: "2px",
                            }}
                          >
                            马上行动 &nbsp;&nbsp;&nbsp;&nbsp; 不找借口
                            &nbsp;&nbsp;&nbsp;&nbsp; 不讲理由
                            &nbsp;&nbsp;&nbsp;&nbsp; 只看结果
                          </div>
                        </td>
                      </tr>

                      {slice.pageNumber === 1 && (
                        <>
                          <tr>
                            <td
                              colSpan={2}
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "3px"),
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                UNIT YANG DI
                                <br />
                                PERIKSA
                                <br />
                                受检单位：
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "3px"),
                                  fontSize: "9.5px",
                                  fontWeight: 600,
                                  wordBreak: "break-word",
                                }}
                              >
                                {renderFormattedUnit(inspectedUnit)}
                              </div>
                            </td>

                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "3px"),
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                PENANGGUNG
                                <br />
                                JAWAB
                                <br />
                                责任人：
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "4px"),
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  wordBreak: "break-word",
                                }}
                              >
                                {picName}
                              </div>
                            </td>

                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "3px"),
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                PEMERIKSA
                                <br />
                                检查人：
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "4px"),
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  wordBreak: "break-word",
                                }}
                              >
                                {inspectorDisplay}
                              </div>
                            </td>

                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "3px"),
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                TANGGAL INSPEKSI
                                <br />
                                检查日期：
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("56px", "4px"),
                                  fontSize: "11px",
                                  fontWeight: 600,
                                }}
                              >
                                {formatDotDate(inspectionDate)}
                              </div>
                            </td>
                          </tr>

                          <tr>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("42px", "2px"),
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                }}
                              >
                                NO
                                <br />
                                序号
                              </div>
                            </td>
                            <td
                              colSpan={6}
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("42px", "8px"),
                                  fontSize: "11px",
                                  fontWeight: 700,
                                }}
                              >
                                DESKRIPSI BAHAYA TERSEMBUNYI
                                <br />
                                隐患描述
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("42px", "3px"),
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                TENGGAT WAKTU
                                <br />
                                整改期限:
                              </div>
                            </td>
                            <td
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  ...centeredCellBox("42px", "4px"),
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#b91c1c",
                                }}
                              >
                                {formatDotDate(deadline)}
                              </div>
                            </td>
                          </tr>
                        </>
                      )}

                      {slice.showSection1 && (
                        <>
                          <tr>
                            <td
                              rowSpan={
                                (slice.showHazardHeader ? 2 : 0) +
                                (slice.showRecHeader ? 2 : 0)
                              }
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                                verticalAlign: "middle",
                                textAlign: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              1
                            </td>

                            {slice.showHazardHeader ? (
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: 0,
                                }}
                              >
                                <div style={subHeaderBox}>
                                  Deskripsi Bahaya/隐患描述
                                  {slice.hazardContinued
                                    ? " (Lanjutan / 续)"
                                    : ""}
                                  ：
                                </div>
                              </td>
                            ) : (
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: 0,
                                }}
                              >
                                <div style={subHeaderBox}>
                                  Rekomendasi Perbaikan/整改要求
                                  {slice.recContinued
                                    ? " (Lanjutan / 续)"
                                    : ""}
                                  ：
                                </div>
                              </td>
                            )}
                          </tr>

                          {slice.showHazardHeader && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: "7px 10px 11px 10px",
                                  fontSize: "11.5px",
                                  lineHeight: 1.55,
                                  height: "76px",
                                  verticalAlign: "top",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {slice.hazardLines.join("\n")}
                              </td>
                            </tr>
                          )}

                          {slice.showHazardHeader && slice.showRecHeader && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: 0,
                                }}
                              >
                                <div style={subHeaderBox}>
                                  Rekomendasi Perbaikan/整改要求
                                  {slice.recContinued
                                    ? " (Lanjutan / 续)"
                                    : ""}
                                  ：
                                </div>
                              </td>
                            </tr>
                          )}

                          {slice.showRecHeader && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: "7px 10px 11px 10px",
                                  fontSize: "11.5px",
                                  lineHeight: 1.55,
                                  height: "76px",
                                  verticalAlign: "top",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                }}
                              >
                                {slice.recLines.join("\n")}
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                      {slice.showSection2 && (
                        <>
                          <tr>
                            <td
                              rowSpan={
                                (slice.showBeforePhotos ? 2 : 0) +
                                (slice.showAfterPhotos ? 2 : 0)
                              }
                              style={{
                                border: "1px solid #000000",
                                padding: 0,
                                verticalAlign: "middle",
                                textAlign: "center",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              2
                            </td>

                            {slice.showBeforePhotos ? (
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: 0,
                                }}
                              >
                                <div style={subHeaderBox}>
                                  Dokumentasi Temuan / 发现照片
                                </div>
                              </td>
                            ) : (
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: 0,
                                }}
                              >
                                <div style={subHeaderBox}>
                                  Dokumentasi Perbaikan / 整改后照片
                                  {slice.section2ContinuedOnly
                                    ? " (Lanjutan / 续)"
                                    : ""}
                                </div>
                              </td>
                            )}
                          </tr>

                          {slice.showBeforePhotos && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: "8px",
                                  height: `${PHOTO_BOX_HEIGHT}px`,
                                  verticalAlign: "middle",
                                }}
                              >
                                {beforePhotos.length > 0 ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        beforePhotos.length === 1
                                          ? "1fr"
                                          : beforePhotos.length === 2
                                          ? "1fr 1fr"
                                          : "1fr 1fr 1fr",
                                      gap: "8px",
                                      height: "138px",
                                    }}
                                  >
                                    {beforePhotos.map((src, pIdx) => (
                                      <div
                                        key={pIdx}
                                        style={{
                                          height: "138px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          overflow: "hidden",
                                          border: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <img
                                          src={src}
                                          alt={`Temuan ${pIdx + 1}`}
                                          crossOrigin={
                                            src.startsWith("http")
                                              ? "anonymous"
                                              : undefined
                                          }
                                          style={{
                                            maxWidth: "100%",
                                            maxHeight: "100%",
                                            objectFit: "contain",
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ height: "138px" }} />
                                )}
                              </td>
                            </tr>
                          )}

                          {slice.showBeforePhotos &&
                            slice.showAfterPhotos && (
                              <tr>
                                <td
                                  colSpan={8}
                                  style={{
                                    border: "1px solid #000000",
                                    padding: 0,
                                  }}
                                >
                                  <div style={subHeaderBox}>
                                    Dokumentasi Perbaikan / 整改后照片
                                  </div>
                                </td>
                              </tr>
                            )}

                          {slice.showAfterPhotos && (
                            <tr>
                              <td
                                colSpan={8}
                                style={{
                                  border: "1px solid #000000",
                                  padding: "8px",
                                  height: `${PHOTO_BOX_HEIGHT}px`,
                                  verticalAlign: "middle",
                                }}
                              >
                                {afterPhotos.length > 0 ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        afterPhotos.length === 1
                                          ? "1fr"
                                          : afterPhotos.length === 2
                                          ? "1fr 1fr"
                                          : "1fr 1fr 1fr",
                                      gap: "8px",
                                      height: "138px",
                                    }}
                                  >
                                    {afterPhotos.map((src, pIdx) => (
                                      <div
                                        key={pIdx}
                                        style={{
                                          height: "138px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          overflow: "hidden",
                                          border: "1px solid #e2e8f0",
                                        }}
                                      >
                                        <img
                                          src={src}
                                          alt={`Perbaikan ${pIdx + 1}`}
                                          crossOrigin={
                                            src.startsWith("http")
                                              ? "anonymous"
                                              : undefined
                                          }
                                          style={{
                                            maxWidth: "100%",
                                            maxHeight: "100%",
                                            objectFit: "contain",
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div style={{ height: "138px" }} />
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )}

                      {slice.showFooter && (
                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("86px", "4px"),
                                fontSize: "11px",
                              }}
                            >
                              Disetujui:
                              <br />
                              核准
                            </div>
                          </td>
                          <td
                            colSpan={2}
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "86px",
                                padding: "6px",
                                textAlign: "center",
                              }}
                            >
                              {approvedSupervisor &&
                                (!sigErrors[approvedSupervisor.id] ? (
                                  <img
                                    src={approvedSupervisor.signatureUrl}
                                    alt={`TTD ${approvedSupervisor.name}`}
                                    onError={() =>
                                      setSigErrors((prev) => ({
                                        ...prev,
                                        [approvedSupervisor.id]: true,
                                      }))
                                    }
                                    style={{
                                      maxWidth: "135px",
                                      maxHeight: "62px",
                                      width: "auto",
                                      height: "auto",
                                      objectFit: "contain",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "8px",
                                      color: "#dc2626",
                                    }}
                                  >
                                    File tidak ditemukan:{" "}
                                    {approvedSupervisor.signatureUrl}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("86px", "4px"),
                                fontSize: "11px",
                              }}
                            >
                              Diperiksa:
                              <br />
                              审验
                            </div>
                          </td>
                          <td
                            colSpan={2}
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "86px",
                                padding: "6px",
                                textAlign: "center",
                              }}
                            >
                              {checkedSupervisor &&
                                (!sigErrors[checkedSupervisor.id] ? (
                                  <img
                                    src={checkedSupervisor.signatureUrl}
                                    alt={`TTD ${checkedSupervisor.name}`}
                                    onError={() =>
                                      setSigErrors((prev) => ({
                                        ...prev,
                                        [checkedSupervisor.id]: true,
                                      }))
                                    }
                                    style={{
                                      maxWidth: "135px",
                                      maxHeight: "62px",
                                      width: "auto",
                                      height: "auto",
                                      objectFit: "contain",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "8px",
                                      color: "#dc2626",
                                    }}
                                  >
                                    File tidak ditemukan:{" "}
                                    {checkedSupervisor.signatureUrl}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("86px", "4px"),
                                fontSize: "11px",
                              }}
                            >
                              Dibuat:
                              <br />
                              承办
                            </div>
                          </td>
                          <td
                            style={{
                              border: "1px solid #000000",
                              padding: 0,
                            }}
                          >
                            <div
                              style={{
                                ...centeredCellBox("86px", "3px"),
                                fontSize: "9.5px",
                                fontWeight: 700,
                                lineHeight: 1.28,
                              }}
                            >
                              DEPARTEMEN
                              <br />
                              KEPATUHAN DAN
                              <br />
                              PENGAWASAN
                              <br />
                              LINGKUNGAN
                              <br />
                              环境合规与监察部
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 (BOTTOM): Saved Cloud & Local History */}
        <section className="bg-white rounded-2xl border border-[#5DA295]/25 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#5DA295]" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Riwayat Permohonan Tersimpan{" "}
                {cloudConnected ? "(Cloud Supabase)" : "(Lokal)"} / 已保存整改通知单 (
                {filteredHistory.length})
              </h3>
              {loadingCloud && (
                <span className="text-[11px] text-[#3e776c] animate-pulse">
                  Memuat...
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode / unit / PIC... / 搜索编号或单位..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
                />
              </div>

              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#FFFDF8] border border-slate-300 rounded-xl focus:outline-none focus:border-[#5DA295]"
              >
                <option value="all">Semua Tenggat / 全部期限</option>
                <option value="urgent">24 Jam / 24小时</option>
                <option value="medium">3 Hari / 3天</option>
                <option value="normal">7 Hari / 7天</option>
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Belum ada data tersimpan. Klik tombol &ldquo;Simpan ke Riwayat /
              保存记录&rdquo; untuk menyimpan permohonan. /
              暂无保存记录，点击“保存记录”按钮即可保存通知单。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFFDF8] border-b border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-bold">Kode / 代码</th>
                    <th className="py-3 px-4 font-bold">
                      Tgl. Inspeksi / 检查日期
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Unit Diperiksa / 受检单位
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Pemeriksa / 检查人
                    </th>
                    <th className="py-3 px-4 font-bold">
                      Tenggat Waktu / 整改期限
                    </th>
                    <th className="py-3 px-4 font-bold text-right">
                      Aksi / 操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FFFDF8]">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {DOC_PREFIX}
                        {item.docSeq}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDotDate(item.inspectionDate)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.inspectedUnit}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {(item.inspectors || []).join(", ") || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-rose-700">
                          {formatDotDate(item.deadline)}
                        </span>
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