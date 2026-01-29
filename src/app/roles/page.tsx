"use client";

import { useEffect, useState } from "react";
import { supabase, Role } from "@/lib/supabase";
import { Trash2, Plus, Users, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        const { data } = await supabase.from("roles").select("*").order("name");
        if (data) setRoles(data);
        setLoading(false);
    };

    const createRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        setCreating(true);
        const { error } = await supabase.from("roles").insert({
            name: newRoleName,
            description: newRoleDesc,
        });

        if (error) {
            alert("Error creating role: " + error.message);
        } else {
            setNewRoleName("");
            setNewRoleDesc("");
            fetchRoles();
        }
        setCreating(false);
    };

    const deleteRole = async (id: string) => {
        if (!window.confirm("Are you sure? This will unassign all users.")) return;

        const { error } = await supabase.from("roles").delete().eq("id", id);
        if (error) {
            alert("Error deleting role: " + error.message);
        } else {
            fetchRoles();
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
                        <p className="text-slate-500 text-sm">Define roles and permissions for your team.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/users" className="text-sm text-slate-500 hover:text-blue-600 hover:underline font-medium">
                            Manage User Directory &rarr;
                        </Link>
                        <Link href="/" className="text-sm text-blue-600 hover:underline">
                            &larr; Back to Pipeline
                        </Link>
                    </div>
                </header>

                {/* CREATE ROLE FORM */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Create New Role</h2>
                    <form onSubmit={createRole} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Role Name</label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="e.g. QA Engineer"
                                value={newRoleName}
                                onChange={e => setNewRoleName(e.target.value)}
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                placeholder="Responsible for..."
                                value={newRoleDesc}
                                onChange={e => setNewRoleDesc(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creating || !newRoleName}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {creating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                            Create Role
                        </button>
                    </form>
                </div>

                {/* ROLES LIST */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Active Roles</h2>
                        <span className="text-xs text-slate-400">{roles.length} roles found</span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Loading roles...</div>
                    ) : roles.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">No roles defined yet. Create one above.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Role Name</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {roles.map(role => (
                                    <tr key={role.id} className="hover:bg-slate-50 group">
                                        <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                {role.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            {role.name}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">{role.description || '-'}</td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2">
                                            <Link
                                                href={`/roles/${role.id}`}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Manage Users"
                                            >
                                                <Users size={16} />
                                            </Link>
                                            <button
                                                onClick={() => deleteRole(role.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete Role"
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
