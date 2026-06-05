import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getCurrentRestaurantId } from "../utils/tenantCache";
import {
  DEFAULT_RECEIPT_HEADER,
  loadReceiptHeaderForRestaurant,
  saveReceiptHeader,
} from "./orderBill/receiptHeaderSettings";
import {
  DEFAULT_POS_PRINTER,
  loadPosPrinterForRestaurant,
  savePosPrinterSettings,
} from "./orderBill/posPrinterSettings";
import { directPrintTestPage } from "./orderBill/receiptPrint";
import {
  DEFAULT_KITCHEN_PRINTER,
  loadKitchenPrinterForRestaurant,
  saveKitchenPrinterSettings,
} from "./kitchenBill/kitchenPrinterSettings";
import { directPrintKitchenTestPage } from "./kitchenBill/kitchenPrint";
import {
  fetchPrinterSettingsFromServer,
  savePrinterSettingsToServer,
  fetchPrintConnectorStatus,
} from "./printing/printerSettingsSync";
import {
  User,
  Mail,
  Lock,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  ArrowRight,
  Save,
  Loader2,
  AlertTriangle,
  Store,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { branding } = useTheme();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
    restaurantId: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [receiptHeader, setReceiptHeader] = useState(DEFAULT_RECEIPT_HEADER);
  const [receiptPhoneCountryCode, setReceiptPhoneCountryCode] = useState("+91");
  const [receiptPhoneDigits, setReceiptPhoneDigits] = useState("");
  const [posPrinter, setPosPrinter] = useState(DEFAULT_POS_PRINTER);
  const [kitchenPrinter, setKitchenPrinter] = useState(DEFAULT_KITCHEN_PRINTER);
  const [testingInvoicePrinter, setTestingInvoicePrinter] = useState(false);
  const [testingKitchenPrinter, setTestingKitchenPrinter] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState({ online: false, onlineCount: 0 });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const rid = getCurrentRestaurantId() || profile.restaurantId;
    if (!rid) return;
    setReceiptHeader(loadReceiptHeaderForRestaurant(rid));
    setPosPrinter(loadPosPrinterForRestaurant(rid));
    setKitchenPrinter(loadKitchenPrinterForRestaurant(rid));
    void fetchPrintConnectorStatus(rid).then(setConnectorStatus);
  }, [profile.restaurantId]);

  useEffect(() => {
    const raw = String(receiptHeader.phone || "").trim();
    if (!raw) {
      setReceiptPhoneDigits("");
      return;
    }

    const trimmed = raw.replace(/\s+/g, "");

    // If the phone value is coming from the current UI typing, don't re-parse and overwrite.
    const composedFromUi = receiptPhoneDigits
      ? `${receiptPhoneCountryCode}${receiptPhoneDigits}`
      : "";
    if (trimmed === composedFromUi) return;

    const match = trimmed.match(/^(\+\d{1,4})?(\d{10})$/);
    if (match) {
      if (match[1]) setReceiptPhoneCountryCode(match[1]);
      setReceiptPhoneDigits(match[2] || "");
      return;
    }

    // Fallback: keep last 10 digits if phone was saved in another format.
    const digitsOnly = trimmed.replace(/\D/g, "");
    const last10 = digitsOnly.slice(-10);
    setReceiptPhoneDigits(last10.length === 10 ? last10 : "");
  }, [receiptHeader.phone, receiptPhoneCountryCode, receiptPhoneDigits]);

  const fetchProfile = async () => {
    try {
      const { data } = await API.get("/auth/profile");
      setProfile({
        name: data.name || "",
        email: data.email || "",
        role: data.role || "Administrator",
        restaurantId: data.restaurantId || "",
      });
      const rid = (data.restaurantId || getCurrentRestaurantId() || "").toString().toUpperCase().trim();
      if (rid) {
        try {
          const { data: brand } = await API.get(`/restaurants/${rid}/branding`);
          const rh = brand?.receiptHeader;
          if (rh && typeof rh === "object") {
            const merged = { ...DEFAULT_RECEIPT_HEADER, ...rh };
            setReceiptHeader(merged);
            saveReceiptHeader(rid, merged);
          }
        } catch (_) {
          // Branding is optional; local receipt cache still applies
        }
        try {
          const synced = await fetchPrinterSettingsFromServer(rid);
          if (synced?.invoice) {
            setPosPrinter(synced.invoice);
            savePosPrinterSettings(rid, synced.invoice);
          }
          if (synced?.kitchen) {
            setKitchenPrinter(synced.kitchen);
            saveKitchenPrinterSettings(rid, synced.kitchen);
          }
        } catch (_) {
          // Server printer settings optional; local cache still applies
        }
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    const rid = getCurrentRestaurantId() || profile.restaurantId;

    try {
      const { data } = await API.put("/auth/profile", {
        name: profile.name,
        email: profile.email,
      });

      setProfile((current) => ({
        ...current,
        name: data.name,
        email: data.email,
      }));

      updateUser({ name: data.name, email: data.email });

      if (rid) {
        // Keep restaurant owner email in sync for SuperAdmin views (restaurants list uses ownerEmail).
        try {
          await API.put(`/restaurants/${rid}/owner-email`, { ownerEmail: data.email });
        } catch (_) {
          // Ignore if the backend forbids this for non-superadmin roles.
        }
        try {
          await API.put(`/restaurants/${rid}/receipt-header`, {
            restaurantName: receiptHeader.restaurantName ?? "",
            address: receiptHeader.address ?? "",
            phone: receiptHeader.phone ?? "",
            gstNumber: receiptHeader.gstNumber ?? "",
          });
        } catch (err) {
          toast.error(err.response?.data?.message || "Receipt header could not be saved to server");
          return;
        }
        saveReceiptHeader(rid, receiptHeader);
        try {
          await savePrinterSettingsToServer(rid, {
            invoice: posPrinter,
            kitchen: kitchenPrinter,
          });
        } catch (err) {
          toast.error(err.response?.data?.message || "Printer settings could not be saved to server");
          return;
        }
        savePosPrinterSettings(rid, posPrinter);
        saveKitchenPrinterSettings(rid, kitchenPrinter);
        toast.success("Profile, receipt header, and printer settings saved.");
      } else {
        toast.success("Profile updated — add restaurant context to save receipt header.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("Passwords do not match");
    }

    if (passwords.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    setUpdatingPassword(true);

    try {
      await API.put("/auth/profile/password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const planName = typeof branding.subscriptionPlan === "object"
    ? branding.subscriptionPlan?.name
    : branding.subscriptionPlan;

  const expiresOn = branding.subscriptionExpiry
    ? new Date(branding.subscriptionExpiry).toLocaleDateString()
    : "Not set";

  const status = branding.subscriptionStatus || "trial";

  const profileDisplayName = profile.name || user?.name || "Admin";
  const profileAvatarSrc = branding.logo
    ? branding.logo
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileDisplayName)}`;
  const profileAvatarIsLogo = Boolean(branding.logo);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200/90 bg-slate-50">
              <img
                src={profileAvatarSrc}
                alt={profileAvatarIsLogo ? `${profileDisplayName} logo` : `${profileDisplayName} avatar`}
                className={`h-full w-full ${profileAvatarIsLogo ? "object-contain" : "object-cover"}`}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400 font-black mb-2">
                Admin Profile
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {profile.name || "Admin User"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {profile.role || "Administrator"}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-600 mb-3">
                <User className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.3em] font-black">Account</span>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p className="font-semibold">{profile.name || "Unknown Administrator"}</p>
                <p className="text-slate-500">{profile.email || "Not available"}</p>
                {profile.restaurantId && (
                  <p className="text-slate-500">Restaurant ID: {profile.restaurantId}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-3 text-slate-600 mb-3">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.3em] font-black">Subscription</span>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 font-black">Current Plan</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{planName || "No Plan"}</p>
                    </div>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-100 text-emerald-700" : status === "expired" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      <span className="uppercase tracking-[0.25em]">{status}</span>
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{branding.subscriptionExpiry ? `Renewal / expiry: ${expiresOn}` : "Expiry not configured"}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-slate-500 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-[0.3em] font-black">Branding</span>
                  </div>
                  <div className="grid gap-3 text-sm text-slate-700">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <span className="font-semibold text-slate-500 sm:w-24">Theme</span>
                      <span>{branding.theme || "default"}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <span className="font-semibold text-slate-500 sm:w-24">Primary</span>
                      <span>{branding.primaryColor || "#f72585"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition sm:w-auto"
            onClick={() => navigate("/admin/subscription")}
          >
            Manage Subscription
            <ArrowRight size={16} />
          </button>
        </section>

        <section className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">My Profile</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Account details and what prints at the top of Invoice Center receipts.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      required
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="email"
                      required
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                {/* <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <Store size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Receipt header</h4>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Printed on receipts from Invoice Center (thermal / browser print).
                    </p>
                  </div>
                </div> */}

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Restaurant name
                    </label>
                    <input
                      type="text"
                      value={receiptHeader.restaurantName}
                      onChange={(e) =>
                        setReceiptHeader({ ...receiptHeader, restaurantName: e.target.value })
                      }
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="e.g. MY CAFE"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Address
                    </label>
                    <textarea
                      value={receiptHeader.address}
                      onChange={(e) =>
                        setReceiptHeader({ ...receiptHeader, address: e.target.value })
                      }
                      rows={3}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                      placeholder="Street, area, city"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                        Phone
                      </label>
                      <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <select
                          value={receiptPhoneCountryCode}
                          onChange={(e) => {
                            const nextCode = e.target.value;
                            setReceiptPhoneCountryCode(nextCode);
                            const nextFull = receiptPhoneDigits
                              ? `${nextCode}${receiptPhoneDigits}`
                              : "";
                            setReceiptHeader({ ...receiptHeader, phone: nextFull });
                          }}
                          className="w-full sm:w-28 shrink-0 bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          <option value="+1">+1 (US)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+61">+61 (AU)</option>
                          <option value="+91">+91 (IN)</option>
                          <option value="+971">+971 (AE)</option>
                        </select>
                        <input
                          type="tel"
                          inputMode="numeric"
                          pattern="\d{10}"
                          maxLength={10}
                          value={receiptPhoneDigits}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setReceiptPhoneDigits(digitsOnly);
                            const nextFull = digitsOnly
                              ? `${receiptPhoneCountryCode}${digitsOnly}`
                              : "";
                            setReceiptHeader({ ...receiptHeader, phone: nextFull });
                          }}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            e.target.setCustomValidity(
                              v && v.length !== 10 ? "Enter exactly 10 digits" : ""
                            );
                          }}
                          className="min-w-0 flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="10-digit number"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                        GST number
                      </label>
                      <input
                        type="text"
                        value={receiptHeader.gstNumber || ""}
                        onChange={(e) =>
                          setReceiptHeader({
                            ...receiptHeader,
                            gstNumber: e.target.value.toUpperCase().slice(0, 15),
                          })
                        }
                        maxLength={15}
                        pattern="^[A-Z0-9]{15}$"
                        onBlur={(e) => {
                          const v = (e.target.value || "").trim();
                          e.target.setCustomValidity(
                            v && v.length !== 15 ? "GST number must be 15 characters" : ""
                          );
                        }}
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                        placeholder="e.g. 22AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div
                  className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                    connectorStatus.online
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      connectorStatus.online ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        connectorStatus.online ? "text-emerald-900" : "text-amber-900"
                      }`}
                    >
                      {connectorStatus.online
                        ? `${connectorStatus.onlineCount} print connector(s) online`
                        : "Print connector offline"}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        connectorStatus.online ? "text-emerald-800" : "text-amber-800"
                      }`}
                    >
                      {connectorStatus.online
                        ? "Mobile and tablet staff can print bills. Any tablet may send jobs; 1–3 tablets can run RestoPrint in the background."
                        : "For mobile/tablet printing, start RestoPrint on at least one restaurant tablet (see docs/mobile-tablet-printing.md)."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Invoice / POS printer</h4>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Direct print from Invoice Center (no browser dialog). On a POS PC or counter
                      tablet run{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono">
                        npm run print-bridge
                      </code>{" "}
                      in the print-bridge folder, then enter your printer&apos;s network IP.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Printer IP address
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={posPrinter.host}
                      onChange={(e) =>
                        setPosPrinter({ ...posPrinter, host: e.target.value.trim() })
                      }
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="e.g. 192.168.1.50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Port
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={posPrinter.port}
                      onChange={(e) =>
                        setPosPrinter({
                          ...posPrinter,
                          port: Number(e.target.value) || 9100,
                        })
                      }
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={testingInvoicePrinter || !posPrinter.host?.trim()}
                  onClick={async () => {
                    const rid = getCurrentRestaurantId() || profile.restaurantId;
                    if (rid) savePosPrinterSettings(rid, posPrinter);
                    setTestingInvoicePrinter(true);
                    try {
                      await directPrintTestPage();
                      toast.success("Test page sent to invoice printer");
                    } catch (err) {
                      toast.error(err?.message || "Test print failed");
                    } finally {
                      setTestingInvoicePrinter(false);
                    }
                  }}
                  className="mt-4 flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {testingInvoicePrinter ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Printer size={14} />
                  )}
                  Test invoice printer
                </button>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">Kitchen / KOT printer</h4>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Separate printer for Kitchen Bill tickets. Use the same RestoPrint bridge; enter
                      your kitchen printer&apos;s network IP (often different from the invoice printer).
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Kitchen printer IP
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={kitchenPrinter.host}
                      onChange={(e) =>
                        setKitchenPrinter({ ...kitchenPrinter, host: e.target.value.trim() })
                      }
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      placeholder="e.g. 192.168.1.51"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                      Port
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={kitchenPrinter.port}
                      onChange={(e) =>
                        setKitchenPrinter({
                          ...kitchenPrinter,
                          port: Number(e.target.value) || 9100,
                        })
                      }
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={testingKitchenPrinter || !kitchenPrinter.host?.trim()}
                  onClick={async () => {
                    const rid = getCurrentRestaurantId() || profile.restaurantId;
                    if (rid) saveKitchenPrinterSettings(rid, kitchenPrinter);
                    setTestingKitchenPrinter(true);
                    try {
                      await directPrintKitchenTestPage();
                      toast.success("Test page sent to kitchen printer");
                    } catch (err) {
                      toast.error(err?.message || "Kitchen test print failed");
                    } finally {
                      setTestingKitchenPrinter(false);
                    }
                  }}
                  className="mt-4 flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {testingKitchenPrinter ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Printer size={14} />
                  )}
                  Test kitchen printer
                </button>
              </div>

              <div className="flex pt-2 sm:justify-end">
                <button
                  disabled={updatingProfile}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 sm:w-auto"
                >
                  {updatingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm"
          >
            <div className="flex items-start gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                <Lock size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Account Security</h3>
                <p className="text-sm text-slate-500">Update your password without changing your profile details.</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 text-slate-500 text-sm">
                  <AlertTriangle size={18} className="mt-1 shrink-0 text-amber-500" />
                  <div>
                    <div className="font-semibold">Secure your admin account</div>
                    <p className="text-slate-400">Use a strong password and keep it private.</p>
                  </div>
                </div>

                <button
                  disabled={updatingPassword}
                  type="submit"
                  className="flex w-full shrink-0 items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200 disabled:opacity-50 sm:w-auto"
                >
                  {updatingPassword ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
