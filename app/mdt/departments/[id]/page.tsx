'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDepartmentStore } from '@/store/departmentStore';

/** 深链接入口 /mdt/departments/[id]，自动跳转到详情模式 */
export default function DepartmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectDepartment, departments } = useDepartmentStore();

  useEffect(() => {
    const id = params.id as string;
    const exists = departments.some((d) => d.id === id);
    if (exists) {
      selectDepartment(id);
      router.replace('/mdt/departments');
    } else {
      router.replace('/mdt/departments');
    }
  }, [params.id, selectDepartment, departments, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">加载科室详情...</p>
      </div>
    </div>
  );
}
