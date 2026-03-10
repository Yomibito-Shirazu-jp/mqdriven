import React, { useState } from 'react';
import { AccountItem, PaymentRecipient, Toast, ConfirmationDialogProps, AllocationDivision, Department, Title, FixedCost } from '../../types';
import { Loader, PlusCircle, Pencil, Trash2, Eye, Zap } from '../Icons';
import AccountItemModal from './AccountItemModal';
import PaymentRecipientModal from './PaymentRecipientModal';
import AllocationDivisionModal from './AllocationDivisionModal';
import FixedCostModal from './FixedCostModal';
import DepartmentModal from './DepartmentModal';
import TitleModal from './TitleModal';

interface MasterManagementPageProps {
  accountItems: AccountItem[];
  paymentRecipients: PaymentRecipient[];
  allocationDivisions: AllocationDivision[];
  fixedCosts: FixedCost[];
  departments: Department[];
  titles: Title[];
  onSaveAccountItem: (item: Partial<AccountItem>) => Promise<void>;
  onDeleteAccountItem: (id: string) => Promise<void>;
  onSavePaymentRecipient: (item: Partial<PaymentRecipient>) => Promise<void>;
  onDeletePaymentRecipient: (id: string) => Promise<void>;
  onSaveFixedCost: (item: Partial<FixedCost>) => Promise<void>;
  onDeleteFixedCost: (id: string) => Promise<void>;
  onSaveAllocationDivision: (item: Partial<AllocationDivision>) => Promise<void>;
  onDeleteAllocationDivision: (id: string) => Promise<void>;
  onSaveDepartment: (item: Partial<Department>) => Promise<void>;
  onDeleteDepartment: (id: string) => Promise<void>;
  onSaveTitle: (item: Partial<Title>) => Promise<void>;
  onDeleteTitle: (id: string) => Promise<void>;
  addToast: (message: string, type: Toast['type']) => void;
  requestConfirmation: (dialog: Omit<ConfirmationDialogProps, 'isOpen' | 'onClose'>) => void;
}

type Tab = 'accounts' | 'recipients' | 'fixed_costs' | 'allocations' | 'departments' | 'titles';

const MasterManagementPage: React.FC<MasterManagementPageProps> = (props) => {
  const { accountItems, paymentRecipients, allocationDivisions, fixedCosts, departments, titles } = props;
  const [activeTab, setActiveTab] = useState<Tab>('accounts');

  const tabs: {id: Tab, label: string}[] = [
      { id: 'accounts', label: `勘定科目（${accountItems.length}）` },
      { id: 'recipients', label: `支払先（${paymentRecipients.length}）` },
      { id: 'fixed_costs', label: `固定費 F（${fixedCosts?.length || 0}）` },
      { id: 'allocations', label: `振分区分（${allocationDivisions.length}）` },
      { id: 'departments', label: `部署（${departments.length}）` },
      { id: 'titles', label: `役職（${titles.length}）` },
  ];

  return (
    <div className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
        
        {activeTab === 'accounts' && <AccountItemsManager {...props} />}
        {activeTab === 'recipients' && <PaymentRecipientsManager {...props} />}
        {activeTab === 'fixed_costs' && <FixedCostsManager {...props} />}
        {activeTab === 'allocations' && <AllocationDivisionsManager {...props} />}
        {activeTab === 'departments' && <DepartmentsManager {...props} />}
        {activeTab === 'titles' && <TitlesManager {...props} />}
    </div>
  );
};

const FixedCostsManager: React.FC<MasterManagementPageProps> = ({ fixedCosts, paymentRecipients, onSaveFixedCost, onDeleteFixedCost, requestConfirmation, addToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<FixedCost | null>(null);

    const handleOpenModal = (item: FixedCost | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };
    
    const handleSave = async (item: Partial<FixedCost>) => {
        await onSaveFixedCost(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: FixedCost) => {
        requestConfirmation({
            title: '固定費設定を削除',
            message: `本当に「${item.description}」の固定費設定を削除しますか？`,
            onConfirm: () => onDeleteFixedCost(item.id),
        });
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200">
             <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        固定費マスタ (F)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">毎月計上される家賃、リース料、光熱費などの定常費用を管理します。</p>
                 </div>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-sm">
                 <thead className="text-xs uppercase bg-slate-50 text-slate-500">
                    <tr>
                        {['カテゴリ', '内容', '月額', '支払先', '期間', '操作'].map(h => (
                            <th key={h} className="px-6 py-3 text-left font-bold">
                                {h}
                            </th>
                        ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {(fixedCosts || []).sort((a,b) => (a.category||'').localeCompare(b.category||'')).map(item => {
                        const recipient = paymentRecipients.find(r => r.id === item.recipient_id);
                        return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{item.category}</span></td>
                                <td className="px-6 py-4 font-medium text-slate-800">{item.description}</td>
                                <td className="px-6 py-4 font-mono font-bold text-indigo-700">¥{Number(item.monthly_amount || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-slate-600 text-xs">{recipient ? (recipient.companyName || recipient.recipientName) : <span className="text-slate-400 italic">未設定</span>}</td>
                                <td className="px-6 py-4 text-[10px] text-slate-500 font-mono">
                                    {item.start_date || '—'} ～ {item.end_date || '—'}
                                </td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => handleOpenModal(item)} className="p-1.5 hover:bg-indigo-50 rounded transition text-indigo-600">
                                        <Pencil className="w-4 h-4"/>
                                    </button>
                                    <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-red-50 rounded transition text-red-500">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                 </tbody>
             </table>
             {isModalOpen && <FixedCostModal item={selectedItem} paymentRecipients={paymentRecipients} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

const AccountItemsManager: React.FC<MasterManagementPageProps> = ({ accountItems, onSaveAccountItem, onDeleteAccountItem, requestConfirmation, addToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AccountItem | null>(null);

    const handleOpenModal = (item: AccountItem | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleSave = async (item: Partial<AccountItem>) => {
        await onSaveAccountItem(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: AccountItem) => {
        requestConfirmation({
            title: '勘定科目を無効化',
            message: `本当に勘定科目「${item.name}」を無効にしますか？関連データに影響する可能性があります。`,
            onConfirm: () => onDeleteAccountItem(item.id),
        });
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
             <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-semibold">勘定科目マスタ（{accountItems.length}件）</h3>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-base">
                 <thead className="text-sm bg-slate-50 dark:bg-slate-700"><tr>{['コード', '名称', 'カテゴリ', '有効', '操作'].map(h => <th key={h} className="px-6 py-3 text-left font-medium">{h}</th>)}</tr></thead>
                 <tbody>
                    {accountItems.sort((a,b) => a.code.localeCompare(b.code)).map(item => (
                        <tr key={item.id} className="border-b dark:border-slate-700">
                            <td className="px-6 py-4">{item.code}</td>
                            <td className="px-6 py-4 font-medium">{item.name}</td>
                            <td className="px-6 py-4">{item.categoryCode}</td>
                            <td className="px-6 py-4">{item.isActive ? 'はい' : 'いいえ'}</td>
                            <td className="px-6 py-4 flex items-center gap-2"><button onClick={() => handleOpenModal(item)} className="p-1"><Pencil className="w-5 h-5"/></button><button onClick={() => handleDelete(item)} className="p-1"><Trash2 className="w-5 h-5 text-red-500"/></button></td>
                        </tr>
                    ))}
                 </tbody>
             </table>
             {isModalOpen && <AccountItemModal item={selectedItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

const PaymentRecipientsManager: React.FC<MasterManagementPageProps> = ({ paymentRecipients, onSavePaymentRecipient, onDeletePaymentRecipient, requestConfirmation, addToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PaymentRecipient | null>(null);

    const handleOpenModal = (item: PaymentRecipient | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };
    
    const handleSave = async (item: Partial<PaymentRecipient>) => {
        await onSavePaymentRecipient(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: PaymentRecipient) => {
        requestConfirmation({
            title: '支払先を削除',
            message: `本当に支払先「${item.companyName || item.recipientName}」を削除しますか？`,
            onConfirm: () => onDeletePaymentRecipient(item.id),
        });
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
             <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-semibold">支払先マスタ（{paymentRecipients.length}件）</h3>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-base">
                 <thead className="text-sm bg-slate-50 dark:bg-slate-700">
                    <tr>
                        {['コード', '会社名', '受取人名', '登録番号', '振込情報', '操作'].map(h => (
                            <th key={h} className="px-6 py-3 text-left font-medium">
                                {h}
                            </th>
                        ))}
                    </tr>
                 </thead>
                 <tbody>
                    {paymentRecipients.map(item => (
                        <tr key={item.id} className="border-b dark:border-slate-700">
                            <td className="px-6 py-4">{item.recipientCode}</td>
                            <td className="px-6 py-4 font-medium">{item.companyName}</td>
                            <td className="px-6 py-4">{item.recipientName}</td>
                            <td className="px-6 py-4">{item.invoiceRegistrationNumber || '—'}</td>
                            <td className="px-6 py-4 text-sm">
                                {item.bankName ? <div>{item.bankName}</div> : <div className="text-slate-400">未設定</div>}
                                {(item.bankBranch || item.bankAccountNumber) && (
                                    <div className="text-slate-500">
                                        {[item.bankBranch, item.bankAccountType, item.bankAccountNumber].filter(Boolean).join(' / ')}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 flex items-center gap-2">
                                <button onClick={() => handleOpenModal(item)} className="p-1">
                                    <Pencil className="w-5 h-5"/>
                                </button>
                                <button onClick={() => handleDelete(item)} className="p-1">
                                    <Trash2 className="w-5 h-5 text-red-500"/>
                                </button>
                            </td>
                        </tr>
                    ))}
                 </tbody>
             </table>
             {isModalOpen && <PaymentRecipientModal item={selectedItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

const AllocationDivisionsManager: React.FC<MasterManagementPageProps> = ({ allocationDivisions, onSaveAllocationDivision, onDeleteAllocationDivision, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<AllocationDivision | null>(null);

    const handleOpenModal = (item: AllocationDivision | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };
    
    const handleSave = async (item: Partial<AllocationDivision>) => {
        await onSaveAllocationDivision(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: AllocationDivision) => {
        requestConfirmation({
            title: '振分区分を削除',
            message: `本当に振分区分「${item.name}」を削除しますか？`,
            onConfirm: () => onDeleteAllocationDivision(item.id),
        });
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
             <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-semibold">振分区分マスタ（{allocationDivisions.length}件）</h3>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-base">
                 <thead className="text-sm bg-slate-50 dark:bg-slate-700"><tr>{['名称', '有効', '操作'].map(h => <th key={h} className="px-6 py-3 text-left font-medium">{h}</th>)}</tr></thead>
                 <tbody>
                    {allocationDivisions.map(item => (
                        <tr key={item.id} className="border-b dark:border-slate-700">
                            <td className="px-6 py-4 font-medium">{item.name}</td>
                            <td className="px-6 py-4">{item.isActive ? 'はい' : 'いいえ'}</td>
                            <td className="px-6 py-4 flex items-center gap-2"><button onClick={() => handleOpenModal(item)} className="p-1"><Pencil className="w-5 h-5"/></button><button onClick={() => handleDelete(item)} className="p-1"><Trash2 className="w-5 h-5 text-red-500"/></button></td>
                        </tr>
                    ))}
                 </tbody>
             </table>
             {isModalOpen && <AllocationDivisionModal item={selectedItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

const DepartmentsManager: React.FC<MasterManagementPageProps> = ({ departments, onSaveDepartment, onDeleteDepartment, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Department | null>(null);

    const handleOpenModal = (item: Department | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };
    
    const handleSave = async (item: Partial<Department>) => {
        await onSaveDepartment(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: Department) => {
        requestConfirmation({
            title: '部署を削除',
            message: `本当に部署「${item.name}」を削除しますか？`,
            onConfirm: () => onDeleteDepartment(item.id),
        });
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
             <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-semibold">部署マスタ（{departments.length}件）</h3>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-base">
                 <thead className="text-sm bg-slate-50 dark:bg-slate-700"><tr>{['名称', '操作'].map(h => <th key={h} className="px-6 py-3 text-left font-medium">{h}</th>)}</tr></thead>
                 <tbody>
                    {departments.map(item => (
                        <tr key={item.id} className="border-b dark:border-slate-700">
                            <td className="px-6 py-4 font-medium">{item.name}</td>
                            <td className="px-6 py-4 flex items-center gap-2"><button onClick={() => handleOpenModal(item)} className="p-1"><Pencil className="w-5 h-5"/></button><button onClick={() => handleDelete(item)} className="p-1"><Trash2 className="w-5 h-5 text-red-500"/></button></td>
                        </tr>
                    ))}
                 </tbody>
             </table>
             {isModalOpen && <DepartmentModal item={selectedItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

const TitlesManager: React.FC<MasterManagementPageProps> = ({ titles, onSaveTitle, onDeleteTitle, requestConfirmation }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Title | null>(null);

    const handleOpenModal = (item: Title | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };
    
    const handleSave = async (item: Partial<Title>) => {
        await onSaveTitle(item);
        setIsModalOpen(false);
    };

    const handleDelete = (item: Title) => {
        requestConfirmation({
            title: '役職を削除',
            message: `本当に役職「${item.name}」を削除しますか？`,
            onConfirm: () => onDeleteTitle(item.id),
        });
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
             <div className="p-4 border-b flex justify-between items-center">
                 <h3 className="text-lg font-semibold">役職マスタ（{titles.length}件）</h3>
                 <button onClick={() => handleOpenModal(null)} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircle className="w-5 h-5"/>新規追加</button>
             </div>
             <table className="w-full text-base">
                 <thead className="text-sm bg-slate-50 dark:bg-slate-700"><tr>{['名称', '有効', '操作'].map(h => <th key={h} className="px-6 py-3 text-left font-medium">{h}</th>)}</tr></thead>
                 <tbody>
                    {titles.map(item => (
                        <tr key={item.id} className="border-b dark:border-slate-700">
                            <td className="px-6 py-4 font-medium">{item.name}</td>
                             <td className="px-6 py-4">{item.isActive ? 'はい' : 'いいえ'}</td>
                            <td className="px-6 py-4 flex items-center gap-2"><button onClick={() => handleOpenModal(item)} className="p-1"><Pencil className="w-5 h-5"/></button><button onClick={() => handleDelete(item)} className="p-1"><Trash2 className="w-5 h-5 text-red-500"/></button></td>
                        </tr>
                    ))}
                 </tbody>
             </table>
             {isModalOpen && <TitleModal item={selectedItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};

export default MasterManagementPage;
