"use client";

import { useEffect, useState } from "react";
import { supabase, UserProfile } from "@/lib/supabase";
import { Trash2, UserPlus, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export default function UsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from("users").select("*").order("full_name");
        if (data) setUsers(data);
        setLoading(false);
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setCreating(true);
        const { error } = await supabase.from("users").insert({
            full_name: newName,
            email: newEmail,
        });

        if (error) {
            alert("Error creating user: " + error.message);
        } else {
            setNewName("");
            setNewEmail("");
            fetchUsers();
        }
        setCreating(false);
    };

    const deleteUser = async (id: string) => {
        if (!window.confirm("Delete this user? They will be removed from all roles.")) return;

        const { error } = await supabase.from("users").delete().eq("id", id);
        if (error) {
            alert("Error deleting user: " + error.message);
        } else {
            fetchUsers();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">User Directory</h1>
                        <p className="text-slate-500 text-sm">Manage team members and accounts.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/roles" className="text-sm text-slate-500 hover:text-blue-600 hover:underline">
                            Manage Roles
                        </Link>
                        <Link href="/" className="text-sm text-blue-600 hover:underline">
                            &larr; Back to Pipeline
                        </Link>
                    </div>
                </header>

                {/* CREATE USER FORM */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Add New User</h2>
                    <form onSubmit={createUser} className="flex gap-4 items-end">
                        <div className="flex-[2]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="e.g. John Doe"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email <span className="text-red-500">*</span></label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="john@example.com"
                                type="email"
                                required
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating || !newEmail}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                            Add User
                        </button>
                    </form>
                </div>

                {/* USERS LIST */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Directory</h2>
                        <span className="text-xs text-slate-400">{users.length} users</span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading directory...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No users found. Add one above.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold uppercase">
                                                {user.full_name?.substring(0, 1) || user.email.substring(0, 1)}
                                            </div>
                                            {user.full_name || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="opacity-50" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
