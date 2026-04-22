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
      case "Pending": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Confirmed": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Seated": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Completed": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "Cancelled": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
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
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-orange-500" />
            Table Reservations
          </h1>
          <p className="text-gray-500 mt-1">Manage guest bookings and table availability</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-4 pr-3 py-2 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          <button 
            onClick={openNewReservationModal}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-orange-100 transition-all font-medium active:scale-95"
          >
            <Plus size={20} />
            New Booking
          </button>
        </div>
      </div>

      {/* Advanced Quick Stats & Filtering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, phone or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { label: "All", value: "All" },
              { label: "Upcoming", value: "Upcoming" },
              { label: "Pending", value: "Pending" },
              { label: "Confirmed (seated)", value: "Seated" },
              { label: "Cancelled", value: "Cancelled" }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  statusFilter === status.value 
                    ? "bg-orange-500 text-white shadow-md shadow-orange-100" 
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-900 font-bold text-sm">Today's Load</p>
            <Users size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600">{reservations.length}</p>
          <p className="text-xs text-orange-700 mt-1 font-medium">{reservations.filter(r => r.status === "Pending").length} waiting check-in</p>
        </div>
      </div>

      {/* Upcoming Section & Main List */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 order-2 lg:order-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-gray-500">Loading reservations...</p>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-gray-300" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No results found</h3>
              <p className="text-gray-500 mt-1 max-w-sm mx-auto">
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
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getStatusColor(res.status)}`}>
                      {getStatusIcon(res.status)}
                      {res.status}
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => openEditReservationModal(res)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Edit3 size={16} />
                      </button>
                       <button 
                        onClick={() => deleteReservation(res._id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-3">{res.customerName}</h3>

                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                        <Clock size={16} />
                      </span>
                      <span className="font-medium">{format(new Date(res.reservationTime), "hh:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                        <Users size={16} />
                      </span>
                      <span>{res.guests} Guests</span>
                      {res.table && (
                         <span className="ml-auto bg-gray-50 px-2 py-0.5 rounded text-xs font-semibold border">Table {res.table}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-600 text-sm">
                      <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Phone size={16} />
                      </span>
                      <span>{res.customerPhone}</span>
                    </div>
                  </div>

                  {res.notes && (
                    <div className="mb-5 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100 italic">
                      "{res.notes}"
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between gap-2">
                    {["Pending", "Confirmed"].includes(res.status) && (
                      <>
                        <button 
                          onClick={() => updateStatus(res._id, "Seated")}
                          className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                        >
                          <UtensilsCrossed size={14} /> Confirm Seat
                        </button>
                        <button 
                          onClick={() => updateStatus(res._id, "Cancelled")}
                          className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {["Seated", "Completed", "Cancelled"].includes(res.status) && (
                       <div className="w-full text-center text-xs text-gray-400 font-medium">
                         No further actions available
                       </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar for Upcoming alerts */}
        <div className="w-full lg:w-80 order-1 lg:order-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Clock4 className="text-orange-500" size={18} />
              Upcoming Arrivals
            </h3>
            
            <div className="space-y-3">
              {upcomingReservations.length > 0 ? (
                upcomingReservations.map(res => (
                  <div key={res._id} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-gray-900 text-sm truncate max-w-[120px]">{res.customerName}</p>
                      <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        {format(new Date(res.reservationTime), "hh:mm a")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {res.guests}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-gray-700">Table {res.table}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400 font-medium">No pending check-ins</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                <div>
                  <h2 className="text-2xl font-bold">{editingReservation ? "Edit Reservation" : "New Reservation"}</h2>
                  <p className="text-orange-100 text-sm mt-1">{editingReservation ? "Update the reservation details below." : "Fill in details for the guest booking"}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Guest Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                    <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="e.g. 0123456789"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                    <label className="text-sm font-bold text-gray-700 ml-1">Table Number</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                    <label className="text-sm font-bold text-gray-700 ml-1">No. of Guests</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                    <label className="text-sm font-bold text-gray-700 ml-1">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                    <label className="text-sm font-bold text-gray-700 ml-1">Time</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
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
                  <label className="text-sm font-bold text-gray-700 ml-1">Special Notes (Optional)</label>
                  <textarea 
                    rows="3"
                    placeholder="e.g. Window seat, anniversary celebration..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                   <button 
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all active:scale-95"
                  >
                    {editingReservation ? "Update Booking" : "Confirm Booking"}
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