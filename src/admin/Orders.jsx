import React, { useState, useEffect, useMemo } from 'react';
import { useOrders } from "../context/OrderContext";
import {
  ShoppingBag, Activity, Coffee,
  Users, DollarSign, UtensilsCrossed, PackageCheck, BellRing
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import PremiumOrderCard from "./orders/components/PremiumOrderCard";
import { isTakeawayOrder } from "./orders/utils/isTakeawayOrder";
import { isStatusActive, normalizeStatus } from "./orders/utils/orderStatus";
import { computeGstFromSubtotal } from "../utils/gstRates";

export default function OrdersDashboard({ overrideOrders = null }) {
  const { orders: ctxOrders, updateOrderStatus: ctxUpdateStatus, fetchOrders, isLoading } = useOrders();
  const orders = overrideOrders !== null ? overrideOrders : ctxOrders;

  // track orders that were just marked served so we can keep their card
  // mounted long enough to show the completion modal before removing
  const [servedPendingIds, setServedPendingIds] = useState(new Set());
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const PER_PAGE = 15;

  // Use a ref to track if we've already done the initial fetch to avoid loops
  const initialFetchDone = React.useRef(false);

  useEffect(() => {
    if (!initialFetchDone.current) {
      fetchOrders();
      initialFetchDone.current = true;
    }
  }, [fetchOrders]);

  const updateOrderStatus = (id, status) => {
    if (status === "Served") {
      setServedPendingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setServedPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 2000);
    }
    ctxUpdateStatus(id, status);
  };

  // DASHBOARD CALCULATIONS
  const statsData = useMemo(() => {
    // Only process orders that are relevant for the current view
    const relevantOrders = orders.filter(o => isStatusActive(o.status));

    const active = relevantOrders
      .filter((o) => !["served", "paid", "closed"].includes(normalizeStatus(o.status)) || servedPendingIds.has(o._id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const served = relevantOrders
      .filter((o) => ["served", "paid", "closed"].includes(normalizeStatus(o.status)))
      .sort((a, b) => new Date(b._optimisticAt || b.updatedAt || b.createdAt || 0) - new Date(a._optimisticAt || a.updatedAt || a.createdAt || 0));

    // Fast reduction for stats
    let revenue = 0;
    let itemsSold = 0;
    const tables = new Set();
    let activeTA = 0;
    let servedTA = 0;

    for (const order of relevantOrders) {
      const isTA = isTakeawayOrder(order);
      const isAct = !["served", "paid", "closed"].includes(normalizeStatus(order.status)) || servedPendingIds.has(order._id);
      
      // Revenue & Items
      const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.qty), 0) || 0;
      const gstComputed = computeGstFromSubtotal(subtotal);
      const tax =
        order.billDetails?.cgst != null || order.billDetails?.sgst != null
          ? Number(order.billDetails.cgst || 0) + Number(order.billDetails.sgst || 0)
          : gstComputed.cgst + gstComputed.sgst;
      revenue += (subtotal + tax);
      itemsSold += order.items?.reduce((sum, item) => sum + item.qty, 0) || 0;

      if (isAct) {
        if (isTA) activeTA++;
        else if (order.table) tables.add(order.table);
      } else {
        if (isTA) servedTA++;
      }
    }

    return { 
      activeOrders: active, 
      servedOrders: served, 
      totalRevenue: revenue, 
      totalItemsSold: itemsSold, 
      liveTablesCount: tables.size, 
      activeTakeawayCount: activeTA, 
      servedTakeawayCount: servedTA 
    };
  }, [orders, servedPendingIds]);

  const { activeOrders, servedOrders, totalRevenue, totalItemsSold, liveTablesCount, activeTakeawayCount, servedTakeawayCount } = statsData;
  const activePages = Math.max(1, Math.ceil(activeOrders.length / PER_PAGE));
  const servedPages = Math.max(1, Math.ceil(servedOrders.length / PER_PAGE));
  const safeActivePage = Math.min(Math.max(1, activePage), activePages);
  const safeHistoryPage = Math.min(Math.max(1, historyPage), servedPages);
  const pagedActiveOrders = activeOrders.slice((safeActivePage - 1) * PER_PAGE, safeActivePage * PER_PAGE);
  const pagedServedOrders = servedOrders.slice((safeHistoryPage - 1) * PER_PAGE, safeHistoryPage * PER_PAGE);

  const stats = useMemo(() => [
    { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Live Tables", value: liveTablesCount, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Active Takeaways/Delivery", value: activeTakeawayCount, icon: ShoppingBag, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Ready", value: orders.filter(o => normalizeStatus(o.status) === "ready").length, icon: BellRing, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Served", value: servedOrders.length, icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Takeaways/Delivery Served", value: servedTakeawayCount, icon: PackageCheck, color: "text-pink-600", bg: "bg-pink-50" },
    { label: "Items Sold", value: totalItemsSold, icon: UtensilsCrossed, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Kitchen Load", value: activeOrders.length > 5 ? "High" : "Normal", icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
  ], [totalRevenue, liveTablesCount, activeTakeawayCount, orders, servedOrders.length, servedTakeawayCount, totalItemsSold, activeOrders.length]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-4 sm:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* HEADER & ANALYTICS */}
        <header className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Kitchen Control <span className="text-orange-500">Center</span></h1>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.3em] text-[10px]">Real-time Operations & History</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm flex flex-col items-center text-center gap-3 transition-all hover:shadow-md">
                <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}><stat.icon size={20} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-xl font-black text-slate-800 italic">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* 1. LIVE ORDERS SECTION */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em]">Ongoing Preparations ({activeOrders.length})</h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
               <Coffee size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Kitchen is currently clear</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {pagedActiveOrders.map((order) => (
                <PremiumOrderCard key={order._id} order={order} updateOrderStatus={updateOrderStatus} />
              ))}
            </div>
          )}

          {activeOrders.length > PER_PAGE && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                disabled={safeActivePage <= 1}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Page {safeActivePage} / {activePages}
              </div>
              <button
                onClick={() => setActivePage((p) => Math.min(activePages, p + 1))}
                disabled={safeActivePage >= activePages}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </section>

        {/* 2. HISTORY SECTION */}
        {servedOrders.length > 0 && (
          <section className="space-y-8 pt-10 border-t border-slate-100">
            <div className="flex items-center justify-center gap-4">
              <div className="h-[1px] w-12 bg-slate-200" />
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Recently Served</h2>
              <div className="h-[1px] w-12 bg-slate-200" />
            </div>
            
            <div className="grid gap-6 opacity-60 hover:opacity-100 transition-opacity duration-150 grayscale-[0.5] hover:grayscale-0">
              {pagedServedOrders.map((order) => (
                <PremiumOrderCard key={order._id || order.id} order={order} updateOrderStatus={updateOrderStatus} isCompleted />
              ))}
            </div>

            {servedOrders.length > PER_PAGE && (
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={safeHistoryPage <= 1}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Page {safeHistoryPage} / {servedPages}
                </div>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(servedPages, p + 1))}
                  disabled={safeHistoryPage >= servedPages}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}