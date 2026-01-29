"use client";

import { useEffect, useState, use } from "react";
import { supabase, Role, UserRole, UserProfile } from "@/lib/supabase";
import { Trash2, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [role, setRole] = useState<Role | null>(null);
    const [assignedUsers, setAssignedUsers] = useState<(UserRole & { users: UserProfile })[]>([]);
    const [loading, setLoading] = useState(true);

    // Create New User State
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [creatingUser, setCreatingUser] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);

        // 1. Fetch Role Details
        const roleRes = await supabase.from("roles").select("*").eq("id", id).single();
        if (roleRes.error) {
            alert("Role not found");
            router.push("/roles");
            return;
        }
        setRole(roleRes.data);

        // 2. Fetch Assigned Users
        const assignedRes = await supabase
            .from("user_roles")
            .select("*, users:user_id(*)") // Foreign key join
            .eq("role_id", id);

        const currentAssignments = assignedRes.data || [];
        // safe cast mostly for TS if schema matches
        setAssignedUsers(currentAssignments as any);

        setLoading(false);
    };



    const createAndAssignUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingUser(true);

        let userIdToAssign = "";

        // 1. Try to Create User
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert({ full_name: newName, email: newEmail })
            .select()
            .single();

        if (userError) {
            // IF DUPLICATE EMAIL -> Fetch the existing user instead
            if (userError.code === '23505') { // Unique violation
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', newEmail)
                    .single();

                if (existingUser) {
                    userIdToAssign = existingUser.id;
                    // Optional: Inform user
                    // alert("User with this email already exists. Assigning them to the role...");
                } else {
                    alert('Error: Email exists but could not fetch user.');
                    setCreatingUser(false);
                    return;
                }
            } else {
                alert('Error creating user: ' + userError.message);
                setCreatingUser(false);
                return;
            }
        } else {
            userIdToAssign = userData.id;
        }

        // 2. Assign to Role
        const { error: assignError } = await supabase
            .from('user_roles')
            .insert({ role_id: id, user_id: userIdToAssign });

        if (assignError) {
            // Handle "Already assigned" gracefully too
            if (assignError.code === '23505') {
                alert('User is already assigned to this role.');
            } else {
                alert('User created/found, but assignment failed: ' + assignError.message);
            }
        } else {
            setNewName("");
            setNewEmail("");
            // setShowCreateForm(false); // Removed
            fetchData();
        }
        setCreatingUser(false);
    };

    const removeUser = async (assignmentId: string) => {
        if (!window.confirm("Remove user from this role?")) return;

        const { error } = await supabase.from("user_roles").delete().eq("id", assignmentId);
        if (!error) fetchData();
    };

    if (loading) return <div className="p-8 text-center">Loading role details...</div>;
    if (!role) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* HEADER */}
                <div className="mb-8">
                    <Link href="/roles" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
                        <ArrowLeft size={16} /> Back to Roles
                    </Link>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {role.name.substring(0, 2).toUpperCase()}
                                </div>
                                {role.name}
                            </h1>
                            <p className="text-slate-500 mt-1 ml-14">{role.description}</p>
                        </div>
                    </div>
                </div>

                {/* CREATE USER CARD */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Add Member
                        </h3>
                    </div>

                    <form onSubmit={createAndAssignUser} className="flex gap-3 items-end p-4 bg-slate-50 rounded border border-slate-100">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                placeholder="Jane Doe"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email</label>
                            <input
                                className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                placeholder="jane@example.com"
                                type="email"
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={creatingUser || !newEmail}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 h-[38px]"
                        >
                            {creatingUser ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                            Add to Role
                        </button>
                    </form>
                </div>

            </div>

            {/* MEMBERS LIST */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Role Members</h3>
                    <span className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">{assignedUsers.length}</span>
                </div>

                {assignedUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <UsersIcon size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No members assigned to this role yet.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {assignedUsers.map((assignment, i) => (
                            <li key={assignment.id || `assign-${i}`} className="px-6 py-4 flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                                        {assignment.users?.full_name?.substring(0, 1) || assignment.users?.email?.substring(0, 1)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{assignment.users?.full_name || 'Unknown User'}</div>
                                        <div className="text-xs text-slate-500">{assignment.users?.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeUser(assignment.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                    title="Remove from Role"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

    );
}

function UsersIcon({ size, className }: { size: number, className: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    )
}
