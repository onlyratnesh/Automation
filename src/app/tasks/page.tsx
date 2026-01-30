"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft, Plus, Calendar, User, Clock,
    Loader2, CheckCircle2, X, AlertCircle
} from "lucide-react";

type CrmTask = {
    id: string;
    lead_id?: string;
    deal_id?: string;
    title: string;
    notes?: string;
    assigned_to: string;
    due_date: string;
    status: string;
    priority: string;
    completed_at?: string;
    lead?: { name: string };
    deal?: { title: string; amount: number };
};

const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Pending', 'Completed', 'Cancelled'];

const priorityColors: Record<string, string> = {
    'High': 'bg-red-100 text-red-700 border-red-300',
    'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'Low': 'bg-green-100 text-green-700 border-green-300',
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<CrmTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("Pending");
    const [showAddModal, setShowAddModal] = useState(false);
    const [completingTask, setCompletingTask] = useState<CrmTask | null>(null);
    const [completionNotes, setCompletionNotes] = useState("");

    const fetchTasks = async () => {
        try {
            const url = filterStatus ? `/api/crm-tasks?status=${filterStatus}` : "/api/crm-tasks";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [filterStatus]);

    const isOverdue = (task: CrmTask) => {
        if (task.status !== 'Pending') return false;
        return new Date(task.due_date) < new Date();
    };

    const handleComplete = async () => {
        if (!completingTask) return;

        try {
            const res = await fetch(`/api/crm-tasks/${completingTask.id}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notes: completionNotes,
                    outcome: "Positive",
                    contacted_by: "current-user-id", // TODO: Get from auth
                }),
            });

            if (res.ok) {
                fetchTasks();
                setCompletingTask(null);
                setCompletionNotes("");
            }
        } catch (error) {
            console.error("Failed to complete task:", error);
        }
    };

    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    const overdueCount = tasks.filter(t => isOverdue(t)).length;

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white rounded-lg transition">
                            <ArrowLeft size={20} className="text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>
                            <p className="text-sm text-slate-500">
                                {pendingCount} pending • {overdueCount > 0 && (
                                    <span className="text-red-500">{overdueCount} overdue</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/tasks/new"
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium"
                    >
                        <Plus size={18} /> Add Task
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {['Pending', 'Completed', 'Cancelled', ''].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === status
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white border hover:bg-amber-50'
                                }`}
                        >
                            {status || 'All'}
                        </button>
                    ))}
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${isOverdue(task) ? 'border-red-300 bg-red-50/50' : ''
                                }`}
                        >
                            {/* Complete Button */}
                            {task.status === 'Pending' && (
                                <button
                                    onClick={() => setCompletingTask(task)}
                                    className="mt-1 p-1 rounded-full border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 transition"
                                >
                                    <CheckCircle2 size={16} className="text-slate-300 hover:text-green-500" />
                                </button>
                            )}
                            {task.status === 'Completed' && (
                                <div className="mt-1 p-1">
                                    <CheckCircle2 size={18} className="text-green-500" />
                                </div>
                            )}

                            {/* Task Content */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className={`font-medium ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                            {task.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                            {task.lead && (
                                                <span className="flex items-center gap-1">
                                                    <User size={12} />
                                                    {task.lead.name}
                                                </span>
                                            )}
                                            {task.deal && (
                                                <span className="flex items-center gap-1">
                                                    ₹{task.deal.amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
                                        {task.priority}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                    <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-500 font-medium' : ''}`}>
                                        {isOverdue(task) && <AlertCircle size={12} />}
                                        <Calendar size={12} />
                                        {new Date(task.due_date).toLocaleDateString()}
                                        {isOverdue(task) && ' (Overdue)'}
                                    </span>
                                    {task.completed_at && (
                                        <span className="text-green-600">
                                            Completed {new Date(task.completed_at).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                {task.notes && (
                                    <p className="mt-2 text-sm text-slate-500">{task.notes}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <Clock size={48} className="mx-auto mb-4 text-slate-300" />
                            <p>No tasks found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Complete Task Modal */}
            {completingTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold">Complete Task</h2>
                            <button onClick={() => setCompletingTask(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            Completing: <strong>{completingTask.title}</strong>
                        </p>

                        <div className="mb-4">
                            <label className="text-xs font-medium text-slate-500">Completion Notes</label>
                            <textarea
                                rows={3}
                                className="w-full border rounded-lg px-3 py-2 mt-1 outline-none focus:border-amber-400 resize-none"
                                placeholder="What was done? Any notes..."
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setCompletingTask(null)}
                                className="flex-1 py-2.5 border rounded-lg hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleComplete}
                                className="flex-1 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                            >
                                ✓ Mark Complete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
