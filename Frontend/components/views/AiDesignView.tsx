"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Video,
  Box,
  Image as ImageIcon,
  Sliders,
  Download,
  Upload,
  Play,
  Layers,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Tv,
} from "lucide-react";

export function AiDesignView() {
  const [activeTab, setActiveTab] = useState<"banner" | "video" | "mockup">("banner");
  const [aiConfigStatus, setAiConfigStatus] = useState<"checking" | "ready" | "missing" | "unavailable">("checking");
  const [aiModels, setAiModels] = useState<{ textModel: string; imageModel: string } | null>(null);

  // 1. Banner Generator State
  const [prompt, setPrompt] = useState(
    "Thiết kế banner màn hình LED P2.5 hội nghị tri ân khách hàng kỷ niệm 15 năm thành lập, phong cách sang trọng, nền xanh dương đậm và ánh vàng kim gold"
  );
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [widthMeters, setWidthMeters] = useState("8.0");
  const [heightMeters, setHeightMeters] = useState("4.5");
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [bannerResult, setBannerResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // 2. Video Storyboard State
  const [videoIdea, setVideoIdea] = useState(
    "Video hiệu ứng 3D khối lập phương bay ra ngoài màn hình LED cong ngã tư, quảng bá ô tô điện VinFast"
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

  useEffect(() => {
    let active = true;
    fetch("/api/ai/design")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message || "Không kiểm tra được cấu hình AI");
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

  const requestDesign = async (mode: "banner" | "storyboard" | "mockup", text: string, file?: File) => {
    const formData = new FormData();
    formData.set("mode", mode);
    formData.set("prompt", text);
    formData.set("aspectRatio", mode === "storyboard" ? videoRatio : aspectRatio);
    formData.set("widthMeters", widthMeters);
    formData.set("heightMeters", heightMeters);
    formData.set("mockupType", mockupType);
    if (file) formData.set("image", file);

    const response = await fetch("/api/ai/design", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error?.message || "Không thể hoàn thành yêu cầu AI");
    }
    return payload.data as { text: string; imageDataUrl: string | null; model: string };
  };

  const handleGenerateBanner = async () => {
    setAiError(null);
    setIsGeneratingBanner(true);
    try {
      const result = await requestDesign("banner", prompt);
      if (!result.imageDataUrl) throw new Error("AI không trả về ảnh thiết kế");
      setBannerResult(result.imageDataUrl);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Không thể tạo banner");
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleGenerateVideo = async () => {
    setAiError(null);
    setIsGeneratingVideo(true);
    try {
      const result = await requestDesign("storyboard", videoIdea);
      setVideoStoryboards(result.text.split(/\r?\n/).map((line: string) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim()).filter(Boolean));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Không thể tạo storyboard");
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleMockupComposite = async () => {
    setAiError(null);
    setIsCompositing(true);
    try {
      if (!mockupFile) throw new Error("Vui lòng chọn ảnh hiện trạng công trình trước");
      const result = await requestDesign("mockup", `Dựng phối cảnh lắp đặt ${mockupType} lên công trình.`, mockupFile);
      if (!result.imageDataUrl) throw new Error("AI không trả về ảnh phối cảnh");
      setMockupResult(result.imageDataUrl);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Không thể tạo phối cảnh");
    } finally {
      setIsCompositing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-600">AI Design Studio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>AI Design & Phối Cảnh Màn Hình LED</span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              Gemini AI
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Bộ công cụ hỗ trợ thiết kế banner tỷ lệ LED, kịch bản video và dựng phối cảnh công trình
          </p>
        </div>

        {/* Studio Tab Pills */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 text-xs font-medium text-slate-600 shadow-sm">
          <button
            onClick={() => setActiveTab("banner")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "banner"
                ? "bg-blue-600 text-white font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>1. AI Banner LED</span>
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "video"
                ? "bg-blue-600 text-white font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>2. Video Kịch Bản 3D</span>
          </button>
          <button
            onClick={() => setActiveTab("mockup")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === "mockup"
                ? "bg-blue-600 text-white font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3. Phối Cảnh Tòa Nhà</span>
          </button>
        </div>
      </div>

      {aiError && (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
          <strong>Không thể hoàn thành tác vụ:</strong> {aiError}
          {aiError.includes("GEMINI_API_KEY") && <span className="block mt-1">Thêm GEMINI_API_KEY vào file .env local, sau đó khởi động lại máy chủ.</span>}
        </div>
      )}

      <div
        role="status"
        className={`rounded-2xl border p-4 flex items-center gap-3 text-xs ${
          aiConfigStatus === "ready"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : aiConfigStatus === "missing" || aiConfigStatus === "unavailable"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-blue-50 border-blue-200/80 text-blue-900"
        }`}
      >
        <Sparkles className="w-5 h-5 shrink-0" />
        <div>
          {aiConfigStatus === "checking" && <strong>Đang kiểm tra cấu hình Gemini…</strong>}
          {aiConfigStatus === "ready" && (
            <>
              <strong>Gemini đã sẵn sàng.</strong> Storyboard dùng {aiModels?.textModel}; tạo ảnh dùng {aiModels?.imageModel}.
            </>
          )}
          {aiConfigStatus === "missing" && (
            <>
              <strong>Chưa cấu hình Gemini:</strong> Thêm GEMINI_API_KEY vào .env trên máy chủ và khởi động lại ứng dụng để bật các công cụ AI.
            </>
          )}
          {aiConfigStatus === "unavailable" && (
            <strong>Không kiểm tra được trạng thái Gemini. Hãy kiểm tra kết nối máy chủ hoặc thử lại sau.</strong>
          )}
          <span className="block mt-1">Nội dung gửi tới Google Gemini; ảnh đầu vào chỉ dùng cho tác vụ phối cảnh.</span>
        </div>
      </div>

      {/* TAB 1: AI Banner LED */}
      {activeTab === "banner" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-600" />
              <span>Cấu Hình Bản Vẽ & Banner Màn Hình LED</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yêu cầu nội dung & chủ đề hiển thị:
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tỷ lệ khung hình:</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                >
                  <option value="16:9">16:9 (Hội trường / Phòng họp)</option>
                  <option value="3:1">3:1 (Mặt tiền tòa nhà ngoài trời)</option>
                  <option value="4:1">4:1 (Bảng điện tử chữ chạy)</option>
                  <option value="1:1">1:1 (Khung vuông chân đứng)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kích thước dự kiến:</label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={widthMeters}
                    onChange={(e) => setWidthMeters(e.target.value)}
                    className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="text"
                    value={heightMeters}
                    onChange={(e) => setHeightMeters(e.target.value)}
                    className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs"
                  />
                  <span className="text-slate-500 text-xs font-medium">mét</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerateBanner}
                disabled={isGeneratingBanner || aiConfigStatus === "checking" || aiConfigStatus === "missing"}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingBanner ? "Đang xử lý tạo mẫu banner..." : "Tạo Bản Nháp Banner LED"}</span>
              </button>
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
            {bannerResult ? (
              <div className="w-full space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-md group">
                  <img
                    src={bannerResult}
                    alt="LED Preview"
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    {widthMeters}m × {heightMeters}m ({aspectRatio})
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Tỷ lệ thiết kế: <strong>{aspectRatio}</strong></span>
                  <a
                    href={bannerResult}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải mẫu thiết kế</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Tv className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">Khung Xem Trước Banner LED</div>
                <p className="text-xs text-slate-400 max-w-xs">
                  Nhấn &ldquo;Tạo Bản Nháp Banner LED&rdquo; để xem mô phỏng hình ảnh đúng tỷ lệ màn hình LED thực tế.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI Video Storyboard */}
      {activeTab === "video" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" />
              <span>Ý Tưởng & Kịch Bản Video Quảng Cáo Màn Hình LED</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mô tả ý tưởng video (Sản phẩm, thương hiệu, hiệu ứng 3D Naked-eye):
              </label>
              <textarea
                rows={3}
                value={videoIdea}
                onChange={(e) => setVideoIdea(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || aiConfigStatus === "checking" || aiConfigStatus === "missing"}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGeneratingVideo ? "Đang phân tích kịch bản..." : "Tạo Phân Cảnh Kịch Bản (Storyboard)"}</span>
            </button>
          </div>

          {videoStoryboards.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Phân cảnh kịch bản Video LED 15 giây:
                </h3>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(videoStoryboards.map((scene, index) => `${index + 1}. ${scene}`).join("\n"))}`}
                  download="storyboard-led-15s.txt"
                  className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải storyboard (.txt)</span>
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videoStoryboards.map((sc, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-blue-600 block mb-1">Phân cảnh {idx + 1}</span>
                    <p className="text-slate-700 leading-relaxed">{sc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LED 3D Mockup PoC */}
      {activeTab === "mockup" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          <div className="max-w-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Box className="w-4 h-4 text-blue-600" />
              <span>Dựng Phối Cảnh Lắp Đặt Màn Hình LED Lên Mặt Tiền Tòa Nhà</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại màn hình LED:</label>
                <select
                  value={mockupType}
                  onChange={(e) => setMockupType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="LED ngoài trời P4 chống nước">Màn hình LED P4 Outdoor mặt tiền</option>
                  <option value="Màn hình LED cong P1.86">Màn hình LED cong P1.86 góc ngã tư</option>
                  <option value="LED trong suốt kính mặt tiền">Màn hình LED lưới trong suốt mặt kính</option>
                  <option value="Bảng điện tử ma trận 3 màu">Bảng điện tử thông tin cổng trường/ngân hàng</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ảnh hiện trạng công trình:</label>
                <input
                  type="file"
                  id="mockup-file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAiError(null);
                    setMockupResult(null);
                    if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      setMockupFile(null);
                      setAiError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
                      event.currentTarget.value = "";
                      return;
                    }
                    if (file && file.size > 10 * 1024 * 1024) {
                      setMockupFile(null);
                      setAiError("Ảnh hiện trạng tối đa 10 MB.");
                      event.currentTarget.value = "";
                      return;
                    }
                    setMockupFile(file);
                  }}
                />
                <label
                  htmlFor="mockup-file"
                  className="flex items-center justify-center gap-2 p-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer text-slate-600 hover:text-blue-600"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{mockupFile ? "Đã chọn ảnh mặt bằng" : "Tải ảnh tòa nhà lên"}</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleMockupComposite}
              disabled={isCompositing || !mockupFile || aiConfigStatus === "checking" || aiConfigStatus === "missing"}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <Layers className="w-4 h-4" />
              <span>{isCompositing ? "Đang ghép phối cảnh 3D..." : "Ghép Phối Cảnh Thực Tế"}</span>
            </button>
          </div>

          {mockupPreviewUrl && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Ảnh hiện trạng đã chọn:
              </h3>
              <img
                src={mockupPreviewUrl}
                alt="Ảnh hiện trạng công trình"
                className="max-h-80 max-w-full rounded-xl border border-slate-200 object-contain"
              />
            </div>
          )}

          {mockupResult && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Kết quả phối cảnh thực tế ({mockupType}):
              </h3>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg max-w-3xl">
                <img
                  src={mockupResult}
                  alt="Mockup result"
                  className="w-full h-80 object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border border-white/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Phối cảnh: {mockupType} trên ảnh công trình đã tải lên</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
