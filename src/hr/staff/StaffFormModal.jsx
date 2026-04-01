import { useState } from 'react';
import { createStaff, updateStaff } from '../../api/hrApi';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <input
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <select
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      {...props}
    >
      {children}
    </select>
  </div>
);

const EMPTY = {
  name: '', email: '', password: '', phone: '',
  role: 'staff', department: '', designation: '',
  joiningDate: '', status: 'active', baseSalary: '',
  address: '', gender: '', dateOfBirth: '', emergencyContact: '',
};

export default function StaffFormModal({ staff, onClose, onSaved }) {
  const isEdit = Boolean(staff?._id);
  const [form, setForm] = useState(
    isEdit
      ? {
          ...EMPTY, ...staff,
          joiningDate: staff.joiningDate ? staff.joiningDate.split('T')[0] : '',
          dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.split('T')[0] : '',
          password: '',
        }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, baseSalary: Number(form.baseSalary) };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) {
        await updateStaff(staff._id, payload);
        toast.success('Staff updated');
      } else {
        await createStaff(payload);
        toast.success('Staff created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Staff' : 'Add New Staff'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Section: Personal */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Info</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="John Doe" />
            <Input label="Email *" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="john@company.com" />
            <Input label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'} type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required={!isEdit} placeholder="••••••••" />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          </div>

          {/* Section: Job Info */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Job Info</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Role *" value={form.role} onChange={(e) => set('role', e.target.value)} required>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
            <Input label="Department" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Kitchen, Service" />
            <Input label="Designation" value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Head Chef, Waiter" />
            <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} />
            <Input label="Base Salary (₹)" type="number" min="0" value={form.baseSalary} onChange={(e) => set('baseSalary', e.target.value)} placeholder="25000" />
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </Select>
          </div>

          {/* Section: Contact */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="City, State" />
            <Input label="Emergency Contact" value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="+91 …" />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
