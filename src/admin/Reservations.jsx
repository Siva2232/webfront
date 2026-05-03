import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { 
  Calendar, 
  Users, 
  Phone, 
  Clock, 
  Plus, 
  MoreVertical, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock4,
  Check,
  Search,
  CalendarDays,
  UtensilsCrossed,
  Edit3
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    guests: 2,
    date: selectedDate,
    time: "19:00",
    table: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [tables, setTables] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerPhone: "",
      guests: 2,
      date: selectedDate,
      time: "19:00",
      table: "",
      notes: ""
    });
    setErrors({});
    setEditingReservation(null);
  };

  const openNewReservationModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditReservationModal = (reservation) => {
    const reservationTime = new Date(reservation.reservationTime);
    setEditingReservation(reservation);
    setFormData({
      customerName: reservation.customerName || "",
      customerPhone: reservation.customerPhone || "",
      guests: reservation.guests || 2,
      date: format(reservationTime, "yyyy-MM-dd"),
      time: format(reservationTime, "HH:mm"),
      table: String(reservation.table || ""),
      notes: reservation.notes || ""
    });
    setErrors({});
    setShowModal(true);
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  useEffect(() => {
    const loadTables = async () => {
      try {
        const { data } = await axios.get("/tables");
        setTables(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Failed to load table list");
      }
    };
    loadTables();
  }, []);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, date: selectedDate }));
  }, [selectedDate]);

  const reservedTableIds = new Set(
    reservations
      .filter((res) => !["Cancelled", "Completed"].includes(res.status))
      .map((res) => String(res.table))
  );

  const availableTables = tables.filter((table) => !reservedTableIds.has(String(table.id)));

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/reservations?date=${selectedDate}`);
      setReservations(data);
    } catch (error) {
      toast.error("Failed to fetch reservations");
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter((res) => {
    const matchesSearch = 
      res.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.customerPhone.includes(searchQuery) ||
      (res.table && String(res.table).includes(searchQuery));
    
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Upcoming" ? ["Pending", "Confirmed"].includes(res.status) : res.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  const upcomingReservations = reservations
    .filter(res => ["Pending", "Confirmed"].includes(res.status))
    .slice(0, 3);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const reservationTime = new Date(`${formData.date}T${formData.time}`);
    const normalizedPhone = formData.customerPhone.replace(/\D/g, "");
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Guest name is required.";
    }
    if (!normalizedPhone) {
      newErrors.customerPhone = "Phone number is required.";
    } else if (!/^\d{7,15}$/.test(normalizedPhone)) {
      newErrors.customerPhone = "Enter a valid phone number.";
    }
    if (!formData.table || !formData.table.trim()) {
      newErrors.table = "Table selection is required.";
    }
    if (!formData.guests || Number(formData.guests) < 1) {
      newErrors.guests = "Guest count must be at least 1.";
    }
    if (!formData.date) {
      newErrors.date = "Reservation date is required.";
    }
    if (!formData.time) {
      newErrors.time = "Reservation time is required.";
    }
    if (formData.date && formData.time && isNaN(reservationTime.getTime())) {
      newErrors.time = "Choose a valid reservation time.";
    } else if (reservationTime.getTime() < Date.now()) {
      newErrors.time = "Reservation time must be in the future.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the highlighted errors before submitting.");
      return;
    }

    try {
      const payload = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        guests: Number(formData.guests),
        table: formData.table.trim(),
        reservationTime: reservationTime.toISOString(),
        notes: formData.notes.trim()
      };

      if (editingReservation) {
        await axios.put(`/reservations/${editingReservation._id}`, payload);
        toast.success("Reservation updated successfully");
      } else {
        await axios.post("/reservations", payload);
        toast.success("Reservation created successfully");
      }

      setShowModal(false);
      resetForm();
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save reservation");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`/reservations/${id}`, { status });
      toast.success(`Reservation marked as ${status}`);
      fetchReservations();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const deleteReservation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await axios.delete(`/reservations/${id}`);
      toast.success("Reservation deleted");
      fetchReservations();
    } catch (error) {
      toast.error("Failed to delete reservation");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "Confirmed":
        return "bg-zinc-100 text-zinc-800 border-zinc-200";
      case "Seated":
        return "bg-neutral-100 text-neutral-900 border-neutral-200";
      case "Completed":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return <Clock4 size={14} />;
      case "Confirmed": return <CheckCircle size={14} />;
      case "Seated": return <UtensilsCrossed size={14} />;
      case "Completed": return <Check size={14} />;
      case "Cancelled": return <XCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-zinc-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" strokeWidth={2} />
            </span>
            Table Reservations
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Manage guest bookings and table availability
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white py-2 pl-4 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition-all focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
          <button
            type="button"
            onClick={openNewReservationModal}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={2} />
            New Booking
          </button>
        </div>
      </div>

      {/* Search & filters */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm md:col-span-3 md:flex-row md:items-center">
          <div className="relative w-full flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-400"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search by name, phone or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
            />
          </div>
          <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-1 md:w-auto md:pb-0">
            {[
              { label: "All", value: "All" },
              { label: "Upcoming", value: "Upcoming" },
              { label: "Pending", value: "Pending" },
              { label: "Confirmed (seated)", value: "Seated" },
              { label: "Cancelled", value: "Cancelled" },
            ].map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setStatusFilter(status.value)}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all md:text-sm ${
                  statusFilter === status.value
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-zinc-900">Today&apos;s load</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Users size={16} strokeWidth={2} />
            </span>
          </div>
          <p className="text-3xl font-black tabular-nums tracking-tight text-zinc-900">
            {reservations.length}
          </p>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {reservations.filter((r) => r.status === "Pending").length} awaiting check-in
          </p>
        </div>
      </div>

      {/* Upcoming Section & Main List */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 order-2 lg:order-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-900" />
              <p className="text-sm text-zinc-500">Loading reservations…</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                <Calendar className="text-zinc-400" size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900">No results found</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                {searchQuery || statusFilter !== "All" 
                  ? "Try adjusting your search or filters to find what you're looking for." 
                  : "There are no table bookings for the selected date. Click \"New Booking\" to add one."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredReservations.map((res) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={res._id}
                  className="group relative rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusColor(res.status)}`}
                    >
                      {getStatusIcon(res.status)}
                      {res.status}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditReservationModal(res)}
                        className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-colors hover:bg-zinc-100 hover:text-zinc-900 group-hover:opacity-100"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReservation(res._id)}
                        className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="mb-3 text-lg font-bold text-zinc-900">{res.customerName}</h3>

                  <div className="mb-5 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                        <Clock size={16} strokeWidth={2} />
                      </span>
                      <span className="font-medium text-zinc-900">
                        {format(new Date(res.reservationTime), "hh:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                        <Users size={16} strokeWidth={2} />
                      </span>
                      <span>{res.guests} guests</span>
                      {res.table && (
                        <span className="ml-auto rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                          Table {res.table}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-sm text-zinc-600">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-800">
                        <Phone size={16} strokeWidth={2} />
                      </span>
                      <span>{res.customerPhone}</span>
                    </div>
                  </div>

                  {res.notes && (
                    <div className="mb-5 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs italic text-zinc-600">
                      &ldquo;{res.notes}&rdquo;
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-4">
                    {["Pending", "Confirmed"].includes(res.status) && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(res._id, "Seated")}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-900 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                        >
                          <UtensilsCrossed size={14} /> Confirm seat
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(res._id, "Cancelled")}
                          className="flex flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-sm font-semibold text-zinc-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {["Seated", "Completed", "Cancelled"].includes(res.status) && (
                      <div className="w-full text-center text-xs font-medium text-zinc-400">
                        No further actions
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="order-1 w-full space-y-6 lg:order-2 lg:w-80">
          <div className="h-fit rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-zinc-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
                <Clock4 size={18} strokeWidth={2} />
              </span>
              Upcoming arrivals
            </h3>

            <div className="space-y-3">
              {upcomingReservations.length > 0 ? (
                upcomingReservations.map((res) => (
                  <div
                    key={res._id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-3 transition-colors hover:border-zinc-300"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="max-w-[120px] truncate text-sm font-bold text-zinc-900">
                        {res.customerName}
                      </p>
                      <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                        {format(new Date(res.reservationTime), "hh:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {res.guests}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="font-bold text-zinc-800">Table {res.table}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs font-medium text-zinc-400">No pending check-ins</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Modal Backdrop */}
      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              className="max-h-[min(92dvh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl sm:rounded-[1.75rem]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 bg-zinc-900 px-6 py-5 text-white">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight">
                    {editingReservation ? "Edit reservation" : "New reservation"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {editingReservation
                      ? "Update the details below."
                      : "Guest booking details"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <XCircle size={22} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="max-h-[calc(min(92dvh,720px)-88px)] space-y-5 overflow-y-auto overscroll-contain p-6 sm:p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Guest name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. John Doe"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={formData.customerName}
                      onChange={(e) => {
                        setFormData({...formData, customerName: e.target.value});
                        setErrors((prev) => ({ ...prev, customerName: undefined }));
                      }}
                    />
                    {errors.customerName && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.customerName}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Phone number</label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. 0123456789"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={formData.customerPhone}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        setFormData({...formData, customerPhone: digitsOnly});
                        setErrors((prev) => ({ ...prev, customerPhone: undefined }));
                      }}
                    />
                    {errors.customerPhone && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Table</label>
                    <select
                      required
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={formData.table}
                      onChange={(e) => {
                        setFormData({...formData, table: e.target.value});
                        setErrors((prev) => ({ ...prev, table: undefined }));
                      }}
                    >
                      <option value="">Select a table</option>
                      {availableTables.length > 0 ? (
                        availableTables.map((table) => (
                          <option key={table.id} value={String(table.id)}>
                            Table {table.id}{table.capacity ? ` — ${table.capacity} seats` : ''}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No available tables for selected date
                        </option>
                      )}
                    </select>
                    {errors.table && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.table}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Guests</label>
                    <select
                      required
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={String(formData.guests)}
                      onChange={(e) => {
                        setFormData({...formData, guests: Number(e.target.value)});
                        setErrors((prev) => ({ ...prev, guests: undefined }));
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((count) => (
                        <option key={count} value={count}>{count} guest{count > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    {errors.guests && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.guests}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Date</label>
                    <input
                      required
                      type="date"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={formData.date}
                      onChange={(e) => {
                        setFormData({...formData, date: e.target.value});
                        setErrors((prev) => ({ ...prev, date: undefined, time: undefined }));
                      }}
                    />
                    {errors.date && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.date}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 text-sm font-bold text-zinc-800">Time</label>
                    <input
                      required
                      type="time"
                      className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                      value={formData.time}
                      onChange={(e) => {
                        setFormData({...formData, time: e.target.value});
                        setErrors((prev) => ({ ...prev, time: undefined }));
                      }}
                    />
                    {errors.time && (
                      <p className="text-rose-500 text-xs font-semibold mt-1">{errors.time}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-sm font-bold text-zinc-800">Notes (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Window seat, anniversary…"
                    className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/15"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-zinc-800 active:scale-[0.99]"
                  >
                    {editingReservation ? "Save changes" : "Confirm booking"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reservations;