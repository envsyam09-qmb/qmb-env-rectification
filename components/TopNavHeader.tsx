"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileSearch } from "lucide-react";

export default function TopNavHeader() {
  const pathname = usePathname();
  const isInvestigasi = pathname === "/investigasi";
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="bg-white border-b border-[#5DA295]/25 shadow-xs sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col md:flex-row items-stretch gap-3.5 md:gap-5">
          {/* KOLOM KIRI: Logo QMB Memenuhi Tinggi Header */}
          <div className="flex items-center justify-center md:justify-start shrink-0">
            {!logoError ? (
              <img
                src="/qmb-logo.png"
                alt="PT QMB New Energy Materials"
                onError={() => setLogoError(true)}
                className="h-14 md:h-[96px] w-auto object-contain"
              />
            ) : (
              <div className="h-14 md:h-[96px] px-5 rounded-xl bg-[#5DA295] text-white flex flex-col items-center justify-center">
                <span className="text-xs font-extrabold tracking-widest">
                  PT QMB
                </span>
                <span className="text-lg font-black">青美邦</span>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: Identitas Perusahaan, Judul Menu Aktif, dan Tab 1 & 2 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
            {/* Baris 1: PT QMB NEW ENERGY MATERIALS | Departemen ... */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className="font-extrabold tracking-wide text-[#3e776c] uppercase">
                PT QMB NEW ENERGY MATERIALS
              </span>
              <span className="text-slate-300 font-bold select-none">|</span>
              <span className="font-semibold text-slate-600">
                Departemen Kepatuhan dan Pengawasan Lingkungan / 环境合规与监察部
              </span>
            </div>

            {/* Baris 2: Teks Menu / Halaman yang Dipilih */}
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              {isInvestigasi
                ? "Laporan Investigasi Khusus Insiden / 环境异常事件专项调查报告"
                : "Surat Permohonan Perbaikan Sarana / 环保隐患整改通知单"}
            </h1>

            {/* Baris 3: Tab 1 & Tab 2 Berjejer di Sebelah Kanan Logo QMB */}
            <nav
              aria-label="Navigasi Formulir Utama"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
            >
              <Link
                href="/"
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  !isInvestigasi
                    ? "bg-[#5DA295] text-white border-[#5DA295] shadow-xs"
                    : "bg-[#FFFDF8] text-slate-600 border-slate-200 hover:border-[#5DA295]/60 hover:text-slate-900"
                }`}
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  1. Permohonan Perbaikan Sarana / 环保隐患整改通知单
                </span>
              </Link>

              <Link
                href="/investigasi"
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                  isInvestigasi
                    ? "bg-[#5DA295] text-white border-[#5DA295] shadow-xs"
                    : "bg-[#FFFDF8] text-slate-600 border-slate-200 hover:border-[#5DA295]/60 hover:text-slate-900"
                }`}
              >
                <FileSearch className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  2. Laporan Investigasi Insiden / 环境异常事件专项调查报告
                </span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}