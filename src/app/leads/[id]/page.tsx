"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, User, Phone, Mail, MapPin, Calendar,
    DollarSign, CreditCard, Clock, Plus, MessageSquare,
    CheckCircle2, Loader2, Edit2, X, PhoneCall, Package
} from "lucide-react";

type Lead = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    source?: string;
    status: string;
    priority: string;
    notes?: string;
    follow_up_date?: string;
    last_contacted_at?: string;
    created_at: string;
};

type Deal = {
    id: string;
    title: string;
    amount: number;
    system_size_kw?: number;
    stage: string;
    probability: number;
    expected_close_date?: string;
};

type Payment = {
    id: string;
    deal_id: string;
    amount: number;
    payment_type: string;
    payment_method?: string;
    reference_number?: string;
    received_at: string;
};

type Activity = {
    id: string;
    type: string;
    notes?: string;
    outcome?: string;
    contacted_at: string;
};

type Task = {
    id: string;
    title: string;
    status: string;
    due_date: string;
    priority: string;
};

const STAGES = ['Site Visit', 'Quotation Sent', 'Negotiation', 'Awaiting Payment', 'Closed Won', 'Closed Lost'];
const PAYMENT_TYPES = ['Advance', 'Partial', 'Final', 'Full', 'Refund'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Finance', 'Card'];

const stageColors: Record<string, string> = {
    'Site Visit': 'bg-blue-100 text-blue-700',
    'Quotation Sent': 'bg-purple-100 text-purple-700',
    'Negotiation': 'bg-amber-100 text-amber-700',
    'Awaiting Payment': 'bg-orange-100 text-orange-700',
    'Closed Won': 'bg-green-100 text-green-700',
    'Closed Lost': 'bg-red-100 text-red-700',
};

const activityIcons: Record<string, string> = {
    'Call': '📞',
    'Email': '📧',
    'Meeting': '🤝',
    'WhatsApp': '💬',
    'Note': '📝',
    'Site Visit': '🏠',
    'Payment Received': '💰',
};

export default function LeadDetailPage() {
    const params = useParams();
    const leadId = params.id as string;

    const [lead, setLead] = useState<Lead | null>(null);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showDealModal, setShowDealModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);

    // Form states
    const [activityForm, setActivityForm] = useState({ type: "Call", notes: "", outcome: "Positive" });
    const [dealForm, setDealForm] = useState({ title: "", amount: 0, system_size_kw: 0, stage: "Site Visit", expected_close_date: "" });
    const [paymentForm, setPaymentForm] = useState({ deal_id: "", amount: 0, payment_type: "Advance", payment_method: "UPI", reference_number: "" });
    const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "Medium" });

    const fetchAllData = async () => {
        try {
            const [leadRes, dealsRes, paymentsRes, activitiesRes, tasksRes] = await Promise.all([
                fetch(`/api/leads/${leadId}`),
                fetch(`/api/deals?lead_id=${leadId}`),
                fetch(`/api/payments?lead_id=${leadId}`),
                fetch(`/api/activities?lead_id=${leadId}`),
                fetch(`/api/crm-tasks?lead_id=${leadId}`),
            ]);

            if (leadRes.ok) setLead(await leadRes.json());
            if (dealsRes.ok) setDeals(await dealsRes.json());
            if (paymentsRes.ok) setPayments(await paymentsRes.json());
            if (activitiesRes.ok) setActivities(await activitiesRes.json());
            if (tasksRes.ok) setTasks(await tasksRes.json());
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leadId) fetchAllData();
    }, [leadId]);

    // Submit handlers
    const createDeal = async () => {
        try {
            const res = await fetch("/api/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: leadId, ...dealForm }),
            });
            if (res.ok) {
                fetchAllData();
                setShowDealModal(false);
                setDealForm({ title: "", amount: 0, system_size_kw: 0, stage: "Site Visit", expected_close_date: "" });
            }
        } catch (error) { console.error("Failed to create deal:", error); }
    };

    const createPayment = async () => {
        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: leadId, ...paymentForm }),
            });
            if (res.ok) {
                fetchAllData();
                setShowPaymentModal(false);
                setPaymentForm({ deal_id: "", amount: 0, payment_type: "Advance", payment_method: "UPI", reference_number: "" });
            }
        } catch (error) { console.error("Failed to create payment:", error); }
    };

    const logActivity = async () => {
        try {
            const res = await fetch("/api/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: leadId, contacted_by: "current-user", ...activityForm }),
            });
            if (res.ok) {
                fetchAllData();
                setShowActivityModal(false);
                setActivityForm({ type: "Call", notes: "", outcome: "Positive" });
            }
        } catch (error) { console.error("Failed to log activity:", error); }
    };

    const createTask = async () => {
        try {
            const res = await fetch("/api/crm-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_id: leadId, assigned_to: "current-user", ...taskForm }),
            });
            if (res.ok) {
                fetchAllData();
                setShowTaskModal(false);
                setTaskForm({ title: "", due_date: "", priority: "Medium" });
            }
        } catch (error) { console.error("Failed to create task:", error); }
    };

    const updateDealStage = async (dealId: string, newStage: string) => {
        try {
            await fetch(`/api/deals/${dealId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stage: newStage }),
            });
            fetchAllData();
        } catch (error) { console.error("Failed to update stage:", error); }
    };

    const getTotalDealValue = () => deals.reduce((sum, d) => sum + d.amount, 0);
    const getTotalPayments = () => payments.reduce((sum, p) => sum + p.amount, 0);
    const getPendingAmount = () => getTotalDealValue() - getTotalPayments();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <p className="text-slate-500">Lead not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/leads" className="p-2 hover:bg-white rounded-lg transition">
                        <ArrowLeft size={20} className="text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-800">{lead.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            {lead.phone && <span className="flex items-center gap-1"><Phone size={14} />{lead.phone}</span>}
                            {lead.email && <span className="flex items-center gap-1"><Mail size={14} />{lead.email}</span>}
                            {lead.source && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Source: {lead.source}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowDealModal(true)} className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                            <Package size={16} /> Add Deal
                        </button>
                        <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm">
                            <CreditCard size={16} /> Add Payment
                        </button>
                        <button onClick={() => setShowActivityModal(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            <PhoneCall size={16} /> Log Activity
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                        <div className="text-xs text-slate-400 uppercase">Total Deal Value</div>
                        <div className="text-2xl font-bold text-slate-800">₹{getTotalDealValue().toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="text-xs text-green-600 uppercase">Payments Received</div>
                        <div className="text-2xl font-bold text-green-700">₹{getTotalPayments().toLocaleString()}</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="text-xs text-amber-600 uppercase">Pending Amount</div>
                        <div className="text-2xl font-bold text-amber-700">₹{getPendingAmount().toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border shadow-sm">
                        <div className="text-xs text-slate-400 uppercase">Status</div>
                        <div className="text-xl font-bold text-slate-800">{lead.status}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    {/* Left: Deals & Payments */}
                    <div className="col-span-2 space-y-6">
                        {/* Deals Section */}
                        <div className="bg-white rounded-xl border shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                                <h2 className="font-semibold text-slate-800">Deals / Products ({deals.length})</h2>
                                <button onClick={() => setShowDealModal(true)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                    <Plus size={12} /> Add Deal
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                {deals.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No deals yet. Click "Add Deal" to create one.</p>
                                ) : (
                                    deals.map(deal => (
                                        <div key={deal.id} className="p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-slate-800">{deal.title}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {deal.system_size_kw && `${deal.system_size_kw} kW • `}
                                                        {deal.probability}% probability
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-green-600">₹{deal.amount.toLocaleString()}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Stage:</span>
                                                <select
                                                    className="text-xs border rounded px-2 py-1 bg-white"
                                                    value={deal.stage}
                                                    onChange={(e) => updateDealStage(deal.id, e.target.value)}
                                                >
                                                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Payments Section */}
                        <div className="bg-white rounded-xl border shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                                <h2 className="font-semibold text-slate-800">Payments ({payments.length})</h2>
                                <button onClick={() => setShowPaymentModal(true)} className="text-xs text-green-500 hover:underline flex items-center gap-1">
                                    <Plus size={12} /> Add Payment
                                </button>
                            </div>
                            <div className="p-4">
                                {payments.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No payments recorded</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-slate-400 uppercase">
                                            <tr>
                                                <th className="text-left pb-2">Date</th>
                                                <th className="text-left pb-2">Type</th>
                                                <th className="text-left pb-2">Method</th>
                                                <th className="text-left pb-2">Ref#</th>
                                                <th className="text-right pb-2">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {payments.map(p => (
                                                <tr key={p.id}>
                                                    <td className="py-2 text-slate-600">{new Date(p.received_at).toLocaleDateString()}</td>
                                                    <td className="py-2">{p.payment_type}</td>
                                                    <td className="py-2 text-slate-500">{p.payment_method || '-'}</td>
                                                    <td className="py-2 text-slate-400 text-xs">{p.reference_number || '-'}</td>
                                                    <td className="py-2 text-right font-medium text-green-600">₹{p.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Tasks Section */}
                        <div className="bg-white rounded-xl border shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b">
                                <h2 className="font-semibold text-slate-800">Tasks ({tasks.length})</h2>
                                <button onClick={() => setShowTaskModal(true)} className="text-xs text-amber-500 hover:underline flex items-center gap-1">
                                    <Plus size={12} /> Add Task
                                </button>
                            </div>
                            <div className="p-4 space-y-2">
                                {tasks.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No tasks</p>
                                ) : (
                                    tasks.map(task => (
                                        <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                                            {task.status === 'Completed' ? (
                                                <CheckCircle2 size={18} className="text-green-500" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                                            )}
                                            <span className={task.status === 'Completed' ? 'line-through text-slate-400' : ''}>{task.title}</span>
                                            <span className="text-xs text-slate-400 ml-auto">{new Date(task.due_date).toLocaleDateString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Activity Timeline */}
                    <div className="bg-white rounded-xl border shadow-sm h-fit">
                        <div className="px-4 py-3 border-b">
                            <h2 className="font-semibold text-slate-800">Activity Timeline</h2>
                        </div>
                        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                            {activities.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No activities yet</p>
                            ) : (
                                activities.map(activity => (
                                    <div key={activity.id} className="flex gap-3">
                                        <div className="text-xl">{activityIcons[activity.type] || '📌'}</div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-slate-800">{activity.type}</div>
                                            {activity.notes && <p className="text-sm text-slate-500 mt-0.5">{activity.notes}</p>}
                                            <div className="text-xs text-slate-400 mt-1">{new Date(activity.contacted_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Deal Modal */}
            {showDealModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Add Deal</h2>
                            <button onClick={() => setShowDealModal(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Deal Title *</label>
                                <input className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g., 5kW Rooftop Solar"
                                    value={dealForm.title} onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Amount (₹) *</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={dealForm.amount} onChange={(e) => setDealForm({ ...dealForm, amount: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">System Size (kW)</label>
                                    <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={dealForm.system_size_kw} onChange={(e) => setDealForm({ ...dealForm, system_size_kw: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Stage</label>
                                    <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={dealForm.stage} onChange={(e) => setDealForm({ ...dealForm, stage: e.target.value })}>
                                        {STAGES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Expected Close</label>
                                    <input type="date" className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={dealForm.expected_close_date} onChange={(e) => setDealForm({ ...dealForm, expected_close_date: e.target.value })} />
                                </div>
                            </div>
                            <button onClick={createDeal} className="w-full py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600">Create Deal</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Record Payment</h2>
                            <button onClick={() => setShowPaymentModal(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Related Deal</label>
                                <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                    value={paymentForm.deal_id} onChange={(e) => setPaymentForm({ ...paymentForm, deal_id: e.target.value })}>
                                    <option value="">-- Select Deal --</option>
                                    {deals.map(d => <option key={d.id} value={d.id}>{d.title} (₹{d.amount.toLocaleString()})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Amount (₹) *</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Type</label>
                                    <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={paymentForm.payment_type} onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}>
                                        {PAYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Method</label>
                                    <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Reference #</label>
                                    <input className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="Transaction ID"
                                        value={paymentForm.reference_number} onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} />
                                </div>
                            </div>
                            <button onClick={createPayment} className="w-full py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">Record Payment</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activity Modal */}
            {showActivityModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Log Activity</h2>
                            <button onClick={() => setShowActivityModal(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Type</label>
                                <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                    value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}>
                                    <option>Call</option><option>Email</option><option>Meeting</option><option>WhatsApp</option><option>Site Visit</option><option>Note</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Outcome</label>
                                <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                    value={activityForm.outcome} onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}>
                                    <option>Positive</option><option>Neutral</option><option>Negative</option><option>No Answer</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Notes</label>
                                <textarea rows={3} className="w-full border rounded-lg px-3 py-2 mt-1 resize-none" placeholder="What was discussed..."
                                    value={activityForm.notes} onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })} />
                            </div>
                            <button onClick={logActivity} className="w-full py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Activity</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Add Task</h2>
                            <button onClick={() => setShowTaskModal(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Task Title *</label>
                                <input className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g., Follow up on quotation"
                                    value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Due Date *</label>
                                    <input type="date" className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-500">Priority</label>
                                    <select className="w-full border rounded-lg px-3 py-2 mt-1"
                                        value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                                        <option>High</option><option>Medium</option><option>Low</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={createTask} className="w-full py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600">Create Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
