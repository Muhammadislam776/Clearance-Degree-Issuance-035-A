import { redirect } from 'next/navigation';

export default function ManageDepartmentsRedirectPage() {
  redirect('/admin/departments');
}
