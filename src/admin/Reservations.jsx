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
  UtensilsCrossed
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    guests: 2,
    date: format(new Date(), "yyyy-MM-dd"),
    time: "19:00",
    table: "",
    notes: ""
  });

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const reservationTime = new Date(`${formData.date}T${formData.time}`);
      
      const payload = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        guests: formData.guests,
        table: formData.table,
        reservationTime: reservationTime.toISOString(),
        notes: formData.notes
      };

      await axios.post("/reservations", payload);
      toast.success("Reservation created successfully");
      setShowModal(false);
      setFormData({
        customerName: "",
        customerPhone: "",
        guests: 2,
        date: format(new Date(), "yyyy-MM-dd"),
        time: "19:00",
        table: "",
        notes: ""
      });
      fetchReservations();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create reservation");
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-orange-100 transition-all font-medium active:scale-95"
          >
            <Plus size={20} />
            New Booking
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-500">Loading reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200 shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="text-gray-300" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No reservations found</h3>
          <p className="text-gray-500 mt-1 max-w-sm mx-auto">There are no table bookings for the selected date. Click "New Booking" to add one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reservations.map((res) => (
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
                {res.status === "Pending" && (
                  <>
                    <button 
                      onClick={() => updateStatus(res._id, "Confirmed")}
                      className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Confirm
                    </button>
                    <button 
                      onClick={() => updateStatus(res._id, "Cancelled")}
                      className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {res.status === "Confirmed" && (
                  <button 
                    onClick={() => updateStatus(res._id, "Seated")}
                    className="flex-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <UtensilsCrossed size={14} /> Mark Seated
                  </button>
                )}
                {res.status === "Seated" && (
                  <button 
                    onClick={() => updateStatus(res._id, "Completed")}
                    className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} /> Completed
                  </button>
                )}
                {["Completed", "Cancelled"].includes(res.status) && (
                   <div className="w-full text-center text-xs text-gray-400 font-medium">
                     No further actions available
                   </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

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
                  <h2 className="text-2xl font-bold">New Reservation</h2>
                  <p className="text-orange-100 text-sm mt-1">Fill in details for the guest booking</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Guest Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="e.g. 0123456789"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Table Number</label>
                    <input 
                      required
                      type="number" 
                      placeholder="e.g. 5"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.table}
                      onChange={(e) => setFormData({...formData, table: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">No. of Guests</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.guests}
                      onChange={(e) => setFormData({...formData, guests: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 ml-1">Time</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
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
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 shadow-xl shadow-orange-100 transition-all active:scale-95"
                  >
                    Confirm Booking
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