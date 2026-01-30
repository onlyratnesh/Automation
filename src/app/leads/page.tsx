"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft, Plus, Phone, Mail, Calendar, User,
    Search, Filter, Loader2, Trash2, Edit2, X
} from "lucide-react";

type Lead = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    status: string;
    assigned_to?: string;
    notes?: string;
    follow_up_date?: string;
    priority: string;
    last_contacted_at?: string;
    created_at: string;
};

const SOURCES = ['Facebook', 'Website', 'Referral', 'WhatsApp', 'Cold Call', 'Other'];
const STATUSES = ['New', 'Contacted', 'Interested', 'Qualified', 'Lost', 'Converted'];
const PRIORITIES = ['High', 'Medium', 'Low'];

const statusColors: Record<string, string> = {
    'New': 'bg-blue-100 text-blue-700 border-blue-300',
    'Contacted': 'bg-purple-100 text-purple-700 border-purple-300',
    'Interested': 'bg-amber-100 text-amber-700 border-amber-300',
    'Qualified': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'Lost': 'bg-red-100 text-red-700 border-red-300',
    'Converted': 'bg-green-100 text-green-700 border-green-300',
};

const priorityColors: Record<string, string> = {
    'High': 'bg-red-100 text-red-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'Low': 'bg-green-100 text-green-700',
};

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: "",
        source: "Website",
        status: "New",
        priority: "Medium",
        notes: "",
        follow_up_date: "",
        last_contacted_at: "",
    });

    const fetchLeads = async () => {
        try {
            const res = await fetch("/api/leads");
            if (res.ok) {
                const data = await res.json();
                setLeads(data);
            }
        } catch (error) {
            console.error("Failed to fetch leads:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingLead ? "PUT" : "POST";
            const url = editingLead ? `/api/leads/${editingLead.id}` : "/api/leads";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                fetchLeads();
                setShowAddModal(false);
                setEditingLead(null);
                setFormData({
                    name: "", phone: "", email: "", source: "Website",
                    status: "New", priority: "Medium", notes: "", follow_up_date: "", last_contacted_at: "",
                });
            }
        } catch (error) {
            console.error("Failed to save lead:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this lead?")) return;
        try {
            const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
            if (res.ok) fetchLeads();
        } catch (error) {
            console.error("Failed to delete lead:", error);
        }
    };

    const openEdit = (lead: Lead) => {
        setEditingLead(lead);
        setFormData({
            name: lead.name,
            phone: lead.phone || "",
            email: lead.email || "",
            source: lead.source || "Website",
            status: lead.status,
            priority: lead.priority,
            notes: lead.notes || "",
            follow_up_date: lead.follow_up_date || "",
            last_contacted_at: lead.last_contacted_at || "",
        });
        setShowAddModal(true);
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone?.includes(searchTerm) ||
            lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || lead.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 p-6">
            {/* Header */}
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white rounded-lg transition">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Leads Management</h1>
                            <p className="text-sm text-slate-500">{leads.length} total leads</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingLead(null); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium"
                    >
                        <Plus size={18} /> Add Lead
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="w-full pl-10 pr-4 py-2.5 border rounded-lg outline-none focus:border-amber-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2.5 border rounded-lg outline-none focus:border-amber-400"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                {/* Leads Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeads.map(lead => (
                        <div key={lead.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <Link href={`/leads/${lead.id}`} className="font-semibold text-slate-800 hover:text-blue-600 hover:underline">
                                        {lead.name}
                                    </Link>
                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-1 ${statusColors[lead.status]}`}>
                                        {lead.status}
                                    </span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded ${priorityColors[lead.priority]}`}>
                                    {lead.priority === 'High' ? '🔴' : lead.priority === 'Low' ? '🟢' : '🟡'} {lead.priority}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 mb-4">
                                {lead.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-slate-400" />
                                        {lead.phone}
                                    </div>
                                )}
                                {lead.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" />
                                        {lead.email}
                                    </div>
                                )}
                                {lead.follow_up_date && (
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-amber-500" />
                                        <span className="text-amber-600">Follow-up: {new Date(lead.follow_up_date).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {lead.last_contacted_at && (
                                    <div className="flex items-center gap-2">
                                        <Phone size={14} className="text-green-500" />
                                        <span className="text-green-600">Last Contact: {new Date(lead.last_contacted_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {lead.source && (
                                <div className="text-[10px] text-slate-400 mb-3">
                                    Source: {lead.source}
                                </div>
                            )}

                            <div className="flex gap-2 pt-3 border-t">
                                <button
                                    onClick={() => openEdit(lead)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded transition"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(lead.id)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                                <Link
                                    href={`/leads/${lead.id}`}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                                >
                                    View →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredLeads.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <User size={48} className="mx-auto mb-4 text-slate-300" />
                        <p>No leads found. Add your first lead!</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
                            <button onClick={() => { setShowAddModal(false); setEditingLead(null); }} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Name *</label>
                                <input
                                    required
                                    className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Phone</label>
                                    <input
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Source</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Status</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Priority</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p === 'High' ? '🔴' : p === 'Low' ? '🟢' : '🟡'} {p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Follow-up Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400"
                                        value={formData.follow_up_date}
                                        onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Last Contacted</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-green-400"
                                        value={formData.last_contacted_at?.slice(0, 16) || ''}
                                        onChange={(e) => setFormData({ ...formData, last_contacted_at: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        className="w-full py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm"
                                        onClick={() => setFormData({ ...formData, last_contacted_at: new Date().toISOString() })}
                                    >
                                        📞 Mark as Contacted Now
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500">Notes</label>
                                <textarea
                                    rows={3}
                                    className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400 resize-none"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium"
                            >
                                {editingLead ? 'Update Lead' : 'Add Lead'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
