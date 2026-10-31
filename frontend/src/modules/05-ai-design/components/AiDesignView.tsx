"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Video,
  Box,
  Image as ImageIcon,
  Download,
  Upload,
  Layers,
  Wand2,
  AlertCircle,
  Tv,
  KeyRound,
} from "lucide-react";
import { DesignMode, AiConfigStatus, AiModelConfig, DesignJobItem } from "../types";
import { cn } from "@/src/core/utils/utils";
import { PageHeader } from "@/src/core/ui/page-header";
import { CardHeader } from "@/src/core/ui/card";
import { Button } from "@/src/core/ui/button";
import { StatusBadge } from "@/src/core/ui/badge";
import { EmptyState } from "@/src/core/ui/feedback-states";
import { MODE_OPTIONS } from "./ai-design-presets";
import { AiDesignRecentJobsTable } from "./AiDesignRecentJobsTable";

export function AiDesignView() {
  const [activeTab, setActiveTab] = useState<DesignMode>("banner");
  const [aiConfigStatus, setAiConfigStatus] =
    useState<AiConfigStatus>("checking");
  const [aiModels, setAiModels] = useState<AiModelConfig | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // 1. Banner LED State
  const [prompt, setPrompt] = useState(
    "Thiết kế banner màn hình LED P2.5 hội nghị tri ân khách hàng kỷ niệm 15 năm thành lập, phong cách hiện đại sang trọng, tông xanh navy đậm và điểm nhấn ánh sáng tinh tế"
  );
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [widthMeters, setWidthMeters] = useState("8.0");
  const [heightMeters, setHeightMeters] = useState("4.5");
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [bannerResult, setBannerResult] = useState<string | null>(null);

  // 2. Storyboard State
  const [videoIdea, setVideoIdea] = useState(
    "Video hiệu ứng 3D khối lập phương chuyển động trên màn hình LED cong góc ngã tư, giới thiệu dòng xe điện đô thị"
  );
  const [videoRatio, setVideoRatio] = useState("9:16");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoStoryboards, setVideoStoryboards] = useState<string[]>([]);

  // 3. Mockup State
  const [mockupFile, setMockupFile] = useState<File | null>(null);
  const [mockupPreviewUrl, setMockupPreviewUrl] = useState<string | null>(null);
  const [mockupType, setMockupType] = useState("LED ngoài trời P4 chống nước");
  const [isCompositing, setIsCompositing] = useState(false);
  const [mockupResult, setMockupResult] = useState<string | null>(null);

  // Session Recent Jobs History (real jobs executed in session — never pre-populated with fake items)
  const [recentJobs, setRecentJobs] = useState<DesignJobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/design")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error?.message || "Không kiểm tra được cấu hình AI"
          );
        }
        if (!active) return;
        setAiConfigStatus(payload.data.configured ? "ready" : "missing");
        setAiModels({
          textModel: payload.data.textModel,
          imageModel: payload.data.imageModel,
        });
      })
      .catch(() => {
        if (active) setAiConfigStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mockupFile) {
      setMockupPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(mockupFile);
    setMockupPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [mockupFile]);

  const requestDesign = async (
    mode: "banner" | "storyboard" | "mockup",
    text: string,
    file?: File
  ) => {
    const formData = new FormData();
    formData.set("mode", mode);
    formData.set("prompt", text);
    formData.set("aspectRatio", mode === "storyboard" ? videoRatio : aspectRatio);
    formData.set("widthMeters", widthMeters);
    formData.set("heightMeters", heightMeters);
    formData.set("mockupType", mockupType);
    if (file) formData.set("image", file);

    // The server gives Gemini up to 90s; cap the browser wait slightly above that so the UI never spins forever.
    let response: Response;
    try {
      response = await fetch("/api/ai/design", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(100_000),
      });
    } catch (error) {
      if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error("AI phản hồi quá lâu (hơn 100 giây). Vui lòng thử lại với mô tả ngắn gọn hơn.");
      }
      throw error;
    }
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(
        payload.error?.message || "Không thể hoàn thành yêu cầu AI"
      );
    }
    return payload.data as {
      text: string;
      imageDataUrl: string | null;
      model: string;
    };
  };

  const upsertJob = (job: DesignJobItem) => {
    setRecentJobs((prev) => {
      const idx = prev.findIndex((item) => item.id === job.id);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = job;
      return next;
    });
  };

  const handleGenerateBanner = async () => {
    if (!prompt.trim()) {
      setAiError("Vui lòng nhập mô tả nội dung Banner LED.");
      return;
    }
    setAiError(null);
    setSelectedJobId(null);
    setIsGeneratingBanner(true);

    const jobId = `JOB-${Date.now().toString().slice(-6)}`;
    const specLabel = `${widthMeters}m × ${heightMeters}m (${aspectRatio})`;
    const baseJob: DesignJobItem = {
      id: jobId,
      mode: "banner",
      modeLabel: "Banner LED",
      promptSummary: prompt.trim(),
      specLabel,
      status: "processing",
      createdAt: new Date().toISOString(),
    };
    upsertJob(baseJob);

    try {
      const result = await requestDesign("banner", prompt);
      if (!result.imageDataUrl) {
        throw new Error("Dịch vụ AI không trả về dữ liệu hình ảnh");
      }
      setBannerResult(result.imageDataUrl);
      upsertJob({
        ...baseJob,
        status: "completed",
        imageDataUrl: result.imageDataUrl,
        modelUsed: result.model,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Không thể tạo Banner LED";
      setAiError(msg);
      upsertJob({
        ...baseJob,
        status: "failed",
        errorMessage: msg,
      });
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoIdea.trim()) {
      setAiError("Vui lòng nhập ý tưởng kịch bản video LED.");
      return;
    }
    setAiError(null);
    setSelectedJobId(null);
    setIsGeneratingVideo(true);

    const jobId = `JOB-${Date.now().toString().slice(-6)}`;
    const baseJob: DesignJobItem = {
      id: jobId,
      mode: "video",
      modeLabel: "Storyboard",
      promptSummary: videoIdea.trim(),
      specLabel: `Khung hình ${videoRatio} · 15 giây`,
      status: "processing",
      createdAt: new Date().toISOString(),
    };
    upsertJob(baseJob);

    try {
      const result = await requestDesign("storyboard", videoIdea);
      const scenes = result.text
        .split(/\r?\n/)
        .map((line: string) =>
          line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim()
        )
        .filter(Boolean);
      setVideoStoryboards(scenes);
      upsertJob({
        ...baseJob,
        status: "completed",
        storyboards: scenes,
        modelUsed: result.model,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Không thể tạo Storyboard";
      setAiError(msg);
      upsertJob({
        ...baseJob,
        status: "failed",
        errorMessage: msg,
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleMockupComposite = async () => {
    if (!mockupFile) {
      setAiError("Vui lòng tải ảnh hiện trạng công trình trước khi ghép phối cảnh.");
      return;
    }
    setAiError(null);
    setSelectedJobId(null);
    setIsCompositing(true);

    const jobId = `JOB-${Date.now().toString().slice(-6)}`;
    const baseJob: DesignJobItem = {
      id: jobId,
      mode: "mockup",
      modeLabel: "Mockup",
      promptSummary: `Phối cảnh ${mockupType} trên ${mockupFile.name}`,
      specLabel: mockupType,
      status: "processing",
      createdAt: new Date().toISOString(),
      sourcePreviewUrl: mockupPreviewUrl,
    };
    upsertJob(baseJob);

    try {
      const result = await requestDesign(
        "mockup",
        `Dựng phối cảnh lắp đặt ${mockupType} lên công trình.`,
        mockupFile
      );
      if (!result.imageDataUrl) {
        throw new Error("Dịch vụ AI không trả về ảnh phối cảnh");
      }
      setMockupResult(result.imageDataUrl);
      upsertJob({
        ...baseJob,
        status: "completed",
        imageDataUrl: result.imageDataUrl,
        modelUsed: result.model,
      });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Không thể ghép phối cảnh";
      setAiError(msg);
      upsertJob({
        ...baseJob,
        status: "failed",
        errorMessage: msg,
      });
    } finally {
      setIsCompositing(false);
    }
  };

  const handleLoadJob = (job: DesignJobItem) => {
    setSelectedJobId(job.id);
    setActiveTab(job.mode);
    setAiError(job.status === "failed" ? job.errorMessage || null : null);
    if (job.mode === "banner" && job.imageDataUrl) {
      setBannerResult(job.imageDataUrl);
    } else if (job.mode === "video" && job.storyboards) {
      setVideoStoryboards(job.storyboards);
    } else if (job.mode === "mockup" && job.imageDataUrl) {
      setMockupResult(job.imageDataUrl);
    }
  };

  const isBusy = isGeneratingBanner || isGeneratingVideo || isCompositing;
  const isAiDisabled =
    aiConfigStatus === "checking" || aiConfigStatus === "missing";

  // Active preview content determination
  const hasCurrentOutput =
    (activeTab === "banner" && Boolean(bannerResult)) ||
    (activeTab === "video" && videoStoryboards.length > 0) ||
    (activeTab === "mockup" && Boolean(mockupResult));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="AI Design"
        description="Không gian sáng tạo hỗ trợ Designer phác thảo Banner màn hình LED, kịch bản Storyboard và phối cảnh công trình."
        actions={
          <>
            {aiConfigStatus === "ready" && (
              <StatusBadge tone="success">
                Gemini AI sẵn sàng ({aiModels?.imageModel || "Configured"})
              </StatusBadge>
            )}
            {aiConfigStatus === "missing" && (
              <StatusBadge tone="warning">AI chưa được cấu hình</StatusBadge>
            )}
            {aiConfigStatus === "unavailable" && (
              <StatusBadge tone="error">Không kết nối được dịch vụ AI</StatusBadge>
            )}
            {aiConfigStatus === "checking" && (
              <StatusBadge tone="info">Đang kiểm tra cấu hình...</StatusBadge>
            )}
          </>
        }
      />

      {/* Split Creative Studio Workspace: Left Controls (5 cols) | Right Preview Canvas (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT PANEL: Mode, Form Inputs, Prompt, Image Upload, Size/Ratio */}
        <div className="lg:col-span-5 crm-card p-5 flex flex-col justify-between gap-5">
          <div className="space-y-5">
            {/* Mode Switcher */}
            <div>
              <label className="crm-label">Chế độ thiết kế</label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = activeTab === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(opt.id);
                        setAiError(null);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        active
                          ? "bg-white text-blue-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-1.5">
                {MODE_OPTIONS.find((m) => m.id === activeTab)?.hint}
              </p>
            </div>

            {/* Mode 1: Banner LED Inputs */}
            {activeTab === "banner" && (
              <div className="space-y-4">
                <div>
                  <label className="crm-label">
                    Mô tả nội dung &amp; phong cách (Prompt)
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Nhập chủ đề sự kiện, màu sắc nhận diện, bố cục ánh sáng..."
                    className="crm-textarea"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="crm-label">Tỷ lệ khung hình</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="crm-select"
                    >
                      <option value="16:9">16:9 (Hội trường / Phòng họp)</option>
                      <option value="3:1">3:1 (Mặt tiền ngoài trời)</option>
                      <option value="4:1">4:1 (Bảng điện tử ngang)</option>
                      <option value="1:1">1:1 (Standee LED vuông)</option>
                    </select>
                  </div>

                  <div>
                    <label className="crm-label">Kích thước thực tế (mét)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={widthMeters}
                        onChange={(e) => setWidthMeters(e.target.value)}
                        aria-label="Chiều ngang (m)"
                        className="crm-input text-center kpi-number"
                      />
                      <span className="text-slate-400 text-xs font-medium">
                        ×
                      </span>
                      <input
                        type="text"
                        value={heightMeters}
                        onChange={(e) => setHeightMeters(e.target.value)}
                        aria-label="Chiều cao (m)"
                        className="crm-input text-center kpi-number"
                      />
                      <span className="text-xs text-slate-500 shrink-0">m</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: Storyboard Inputs */}
            {activeTab === "video" && (
              <div className="space-y-4">
                <div>
                  <label className="crm-label">
                    Ý tưởng kịch bản Video LED 3D (Prompt)
                  </label>
                  <textarea
                    rows={4}
                    value={videoIdea}
                    onChange={(e) => setVideoIdea(e.target.value)}
                    placeholder="Mô tả sản phẩm, chuyển động hiệu ứng thị giác 3D Naked-eye, thông điệp kết..."
                    className="crm-textarea"
                  />
                </div>

                <div>
                  <label className="crm-label">Tỷ lệ màn hình phát</label>
                  <select
                    value={videoRatio}
                    onChange={(e) => setVideoRatio(e.target.value)}
                    className="crm-select"
                  >
                    <option value="9:16">9:16 (Trụ LED dọc / Standee)</option>
                    <option value="16:9">16:9 (Màn hình ngang tiêu chuẩn)</option>
                    <option value="3:1">3:1 (Màn hình góc cong tòa nhà)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Mode 3: Mockup Inputs */}
            {activeTab === "mockup" && (
              <div className="space-y-4">
                <div>
                  <label className="crm-label">Dòng màn hình lắp đặt</label>
                  <select
                    value={mockupType}
                    onChange={(e) => setMockupType(e.target.value)}
                    className="crm-select"
                  >
                    <option value="LED ngoài trời P4 chống nước">
                      Màn hình LED P4 Outdoor mặt tiền
                    </option>
                    <option value="Màn hình LED cong P1.86">
                      Màn hình LED cong P1.86 góc ngã tư
                    </option>
                    <option value="LED trong suốt kính mặt tiền">
                      Màn hình LED lưới trong suốt mặt kính
                    </option>
                    <option value="Bảng điện tử ma trận 3 màu">
                      Bảng điện tử thông tin cổng cơ quan / ngân hàng
                    </option>
                  </select>
                </div>

                <div>
                  <label className="crm-label">
                    Ảnh hiện trạng công trình (JPG, PNG, WebP · Tối đa 10MB)
                  </label>
                  <input
                    type="file"
                    id="mockup-file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setAiError(null);
                      setMockupResult(null);
                      if (
                        file &&
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type
                        )
                      ) {
                        setMockupFile(null);
                        setAiError("Chỉ chấp nhận định dạng JPG, PNG hoặc WebP.");
                        event.currentTarget.value = "";
                        return;
                      }
                      if (file && file.size > 10 * 1024 * 1024) {
                        setMockupFile(null);
                        setAiError("Dung lượng ảnh hiện trạng tối đa 10 MB.");
                        event.currentTarget.value = "";
                        return;
                      }
                      setMockupFile(file);
                    }}
                  />
                  <label
                    htmlFor="mockup-file"
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-slate-100/80 border border-dashed border-slate-300 rounded-xl cursor-pointer transition-colors text-center"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <div className="text-xs font-medium text-slate-700">
                      {mockupFile
                        ? mockupFile.name
                        : "Bấm để tải ảnh mặt bằng / tòa nhà"}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Ảnh chỉ dùng làm đầu vào ghép phối cảnh trực tiếp
                    </span>
                  </label>

                  {mockupPreviewUrl && (
                    <div className="mt-2.5 flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                      <img
                        src={mockupPreviewUrl}
                        alt="Ảnh hiện trạng đã chọn"
                        className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-800 truncate">
                          {mockupFile?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Sẵn sàng ghép phối cảnh {mockupType}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Alert */}
            {aiError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Không thể thực hiện:</span>{" "}
                  {aiError}
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            {activeTab === "banner" && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isGeneratingBanner}
                disabled={isAiDisabled}
                leftIcon={<Wand2 className="w-4 h-4" />}
                onClick={handleGenerateBanner}
              >
                Tạo bản nháp Banner LED
              </Button>
            )}

            {activeTab === "video" && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isGeneratingVideo}
                disabled={isAiDisabled}
                leftIcon={<Sparkles className="w-4 h-4" />}
                onClick={handleGenerateVideo}
              >
                Tạo kịch bản Storyboard
              </Button>
            )}

            {activeTab === "mockup" && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isCompositing}
                disabled={isAiDisabled || !mockupFile}
                leftIcon={<Layers className="w-4 h-4" />}
                onClick={handleMockupComposite}
              >
                Ghép phối cảnh thực tế
              </Button>
            )}

            {aiConfigStatus === "missing" && (
              <p className="text-[11px] text-amber-700 text-center">
                Cần cấu hình biến môi trường <code className="font-mono">GEMINI_API_KEY</code> trên máy chủ để kích hoạt tính năng tạo thiết kế.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Unified Studio Preview & Result Canvas */}
        <div className="lg:col-span-7 crm-card p-5 flex flex-col justify-between min-h-[430px]">
          <div className="pb-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Khung xem trước &amp; Kết quả (Preview)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === "banner" &&
                  `Mô phỏng tỷ lệ ${aspectRatio} · Kích thước ${widthMeters}m × ${heightMeters}m`}
                {activeTab === "video" &&
                  `Kịch bản phân cảnh Video LED · Tỷ lệ ${videoRatio}`}
                {activeTab === "mockup" &&
                  `Phối cảnh lắp đặt: ${mockupType}`}
              </p>
            </div>

            {/* Download Action when Output Exists */}
            {activeTab === "banner" && bannerResult && (
              <a
                href={bannerResult}
                download={`banner-led-${aspectRatio.replace(":", "x")}.png`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải ảnh mẫu</span>
              </a>
            )}
            {activeTab === "video" && videoStoryboards.length > 0 && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                  videoStoryboards
                    .map((scene, index) => `${index + 1}. ${scene}`)
                    .join("\n")
                )}`}
                download="storyboard-led-15s.txt"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải kịch bản (.txt)</span>
              </a>
            )}
            {activeTab === "mockup" && mockupResult && (
              <a
                href={mockupResult}
                download="phoi-canh-led-toantrung.png"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải phối cảnh</span>
              </a>
            )}
          </div>

          {/* Canvas Body */}
          <div className="flex-1 flex flex-col justify-center py-4">
            {isBusy ? (
              <div className="w-full space-y-4 py-8 px-4">
                <div className="h-56 rounded-xl bg-slate-100 animate-pulse border border-slate-200/70 flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-500 animate-spin" />
                  <span className="text-xs font-medium text-slate-600">
                    Đang kết xuất bản nháp thiết kế với Gemini AI...
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded col-span-2" />
                </div>
              </div>
            ) : activeTab === "banner" && bannerResult ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950">
                  <img
                    src={bannerResult}
                    alt="Kết quả thiết kế Banner LED"
                    className="w-full max-h-[340px] object-contain mx-auto"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-md font-mono">
                    {widthMeters}m × {heightMeters}m · {aspectRatio}
                  </div>
                </div>
              </div>
            ) : activeTab === "video" && videoStoryboards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {videoStoryboards.map((scene, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                  >
                    <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                      Phân cảnh {idx + 1}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {scene}
                    </p>
                  </div>
                ))}
              </div>
            ) : activeTab === "mockup" && mockupResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mockupPreviewUrl && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Ảnh hiện trạng gốc
                    </span>
                    <img
                      src={mockupPreviewUrl}
                      alt="Hiện trạng công trình"
                      className="w-full h-64 object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "space-y-1.5",
                    !mockupPreviewUrl && "sm:col-span-2"
                  )}
                >
                  <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                    Phối cảnh {mockupType}
                  </span>
                  <img
                    src={mockupResult}
                    alt="Kết quả ghép phối cảnh LED"
                    className="w-full h-64 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              </div>
            ) : !hasCurrentOutput &&
              (aiConfigStatus === "missing" ||
                aiConfigStatus === "unavailable") ? (
              <EmptyState
                icon={KeyRound}
                title="AI chưa được cấu hình"
                description={
                  aiConfigStatus === "missing"
                    ? "Máy chủ chưa được thiết lập GEMINI_API_KEY trong tệp môi trường (.env). Vui lòng cấu hình khóa API và khởi động lại dịch vụ để tạo hình ảnh & kịch bản thực tế."
                    : "Hiện không thể kiểm tra trạng thái dịch vụ Gemini AI từ máy chủ. Vui lòng kiểm tra kết nối backend và thử lại."
                }
              />
            ) : (
              <EmptyState
                icon={Tv}
                title="Khung xem trước đang chờ lệnh tạo"
                description="Thiết lập thông số kích thước, tải ảnh mặt bằng hoặc nhập mô tả ở bảng bên trái để khởi tạo bản nháp thiết kế."
              />
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {aiModels
                ? `Models: ${aiModels.textModel} · ${aiModels.imageModel}`
                : "Dịch vụ xử lý: Google Gemini API"}
            </span>
            <span>Không lưu trữ ảnh mẫu giả lập</span>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Recent Jobs in Workspace Session */}
      <AiDesignRecentJobsTable
        recentJobs={recentJobs}
        selectedJobId={selectedJobId}
        onSelectJob={handleLoadJob}
      />
    </div>
  );
}
