/**
 * components/dashboards/TeacherDashboard.tsx
 *
 * Upgraded: 
 * - Live AbsenceSwapStatusPanel
 * - "Today's Schedule" now fetches from the dynamic /api/teachers/daily-schedule 
 * to automatically include Swaps and Substitutions!
 */

import {
  AlertCircle, ArrowUpDown, BookOpen, Building2,
  Calendar, CheckCircle, Clock, GraduationCap,
  MapPin, Plus, RefreshCw, Target, TrendingUp, User,
  BadgeAlert, Send, Inbox, ChevronRight,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherSchedule } from '../../hooks/useTeacherSchedule';
import { Session } from '../../types/teacher.types';
import TimetableGenerator from '../timetable/TimetableGenerator';
import Button from '../ui/Button';
import Card from '../ui/Card';
import './TeacherDashboard.css';

const BASE = '/api';
function authHeaders() {
  const t = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Failed');
  return j.data as T;
}

export interface TodayClass {
  id: string; subject: string; subjectCode: string; timeSlot: string;
  status: 'upcoming' | 'ongoing' | 'completed'; canSwap?: boolean;
  dynamicStatus?: string; // <--- NEW: 'Regular' | 'Swapped In' | 'Substitute'
  timetableId?: string; scheduleIndex?: number; startTime?: string; endTime?: string;
  course?: string; room?: string; type?: string; semester?: number; division?: string;
  batch?: string | null; courseName?: string | null; courseCode?: string | null;
  roomNumber?: string | null; substituteTeacher?: string | null; substituteName?: string | null;
  suggestedTeachers?: any[]; substituteStatus?: string;
}

interface SubjectProgress {
  id: string; name: string; code: string; totalLectures: number;
  completedLectures: number; semester: string; credits: number; type: 'theory' | 'practical';
}
interface SwapItem {
  _id: string; status: string; createdAt: string;
  requestedBy?: { user?: { name?: string } }; requestedTo?: { user?: { name?: string } };
  fromSession?: { courseCode?: string }; toSession?: { courseCode?: string };
}
interface AbsenceItem {
  _id: string; absenceDate: string; dayOfWeek?: string; status: string;
  affectedClasses?: { substituteStatus?: string }[];
}

const DAY_ORDER: Record<string, number> = { Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6,Sunday:7 };

function toSubjectProgress(sessions: Session[], now: Date): SubjectProgress[] {
  const todayName=now.toLocaleDateString('en-US',{weekday:'long'}); const todayIdx=DAY_ORDER[todayName]||0;
  const map=new Map<string,SubjectProgress>();
  sessions.forEach(s=>{
    const key=s.courseCode||s.courseName;
    if(!map.has(key)) map.set(key,{id:s.courseId||key,name:s.courseName||'N/A',code:s.courseCode||'N/A',
      totalLectures:0,completedLectures:0,semester:String(s.semester||''),credits:s.credits||0,type:s.type==='Lab'?'practical':'theory'});
    const entry=map.get(key)!; entry.totalLectures+=1;
    const sessionIdx=DAY_ORDER[s.dayOfWeek]||0; const [eh,em]=s.endTime.split(':').map(Number);
    const sessionEnd=new Date(); sessionEnd.setHours(eh,em,0,0);
    if(todayIdx>sessionIdx||(todayIdx===sessionIdx&&now>sessionEnd)) entry.completedLectures+=1;
  });
  return Array.from(map.values());
}

const statusColor=(s:string)=>({completed:'bg-green-100 text-green-800 border-green-200',ongoing:'bg-blue-100 text-blue-800 border-blue-200',upcoming:'bg-yellow-100 text-yellow-800 border-yellow-200'}[s]??'bg-gray-100 text-gray-800 border-gray-200');
const typeColor=(t:string|undefined)=>{ if(!t) return 'bg-gray-100 text-gray-800'; return {lecture:'bg-blue-100 text-blue-800',practical:'bg-purple-100 text-purple-800',theory:'bg-blue-100 text-blue-800'}[t]??'bg-gray-100 text-gray-800'; };
const progressColor=(pct:number)=>pct>=90?'bg-green-500':pct>=70?'bg-blue-500':pct>=50?'bg-yellow-500':'bg-red-500';
const greeting=()=>{ const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };
function fmtDate(d:string){ return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }

// ── Absence & Swap Status Panel ───────────────────────────────────────────────

function AbsenceSwapStatusPanel() {
  const navigate=useNavigate();
  const [swapsOut,setSwapsOut]=useState<SwapItem[]>([]);
  const [swapsIn,setSwapsIn]=useState<SwapItem[]>([]);
  const [absences,setAbsences]=useState<AbsenceItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [activeTab,setActiveTab]=useState<'swaps'|'absences'>('swaps');

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [o,i,a]=await Promise.all([
        apiGet<SwapItem[]>('/swaps/outgoing'),
        apiGet<SwapItem[]>('/swaps/incoming?status=all'),
        apiGet<AbsenceItem[]>('/absences/my-absences'),
      ]);
      setSwapsOut(o); setSwapsIn(i); setAbsences(a);
    } catch{}
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const pendingOut=swapsOut.filter(s=>['pending_teacher','pending_admin'].includes(s.status)).length;
  const pendingIn=swapsIn.filter(s=>s.status==='pending_teacher').length;
  const pendingAbs=absences.filter(a=>['substitutes_suggested','partially_assigned','fully_assigned'].includes(a.status)).length;
  const totalBadge=pendingOut+pendingIn+pendingAbs;

  const recentSwaps=[...swapsOut,...swapsIn].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,3);

  const swapMeta:Record<string,{label:string;color:string;bg:string}>={
    pending_teacher:{label:'Awaiting',color:'#b45309',bg:'#fffbeb'},
    pending_admin:{label:'Pending Admin',color:'#1d4ed8',bg:'#eff6ff'},
    approved:{label:'Approved',color:'#065f46',bg:'#ecfdf5'},
    rejected_teacher:{label:'Rejected',color:'#991b1b',bg:'#fef2f2'},
    rejected_admin:{label:'Rejected',color:'#991b1b',bg:'#fef2f2'},
    cancelled:{label:'Cancelled',color:'#6b7280',bg:'#f9fafb'},
  };
  const absMeta:Record<string,{label:string;color:string;bg:string}>={
    substitutes_suggested:{label:'Pending',color:'#b45309',bg:'#fffbeb'},
    partially_assigned:{label:'Partial',color:'#1d4ed8',bg:'#eff6ff'},
    fully_assigned:{label:'Ready',color:'#3730a3',bg:'#eef2ff'},
    published:{label:'Published ✓',color:'#065f46',bg:'#ecfdf5'},
    rejected:{label:'Rejected',color:'#991b1b',bg:'#fef2f2'},
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Swap &amp; Absence</h3>
          {totalBadge>0&&<span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">{totalBadge}</span>}
        </div>
        <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <RefreshCw className="h-3.5 w-3.5"/>
        </button>
      </div>

      <div className="px-5 pt-3 pb-0 flex gap-2 flex-wrap">
        {[
          {bg:'#eff6ff',icon:<Send className="h-3 w-3 text-blue-600"/>,label:`${pendingOut} sent`,color:'text-blue-700'},
          {bg:'#fef2f2',icon:<Inbox className="h-3 w-3 text-red-500"/>,label:`${pendingIn} needs reply`,color:'text-red-600'},
          {bg:'#fff7ed',icon:<BadgeAlert className="h-3 w-3 text-orange-500"/>,label:`${pendingAbs} absence pending`,color:'text-orange-700'},
        ].map(({bg,icon,label,color})=>(
          <div key={label} style={{background:bg,borderRadius:8,padding:'5px 10px',display:'flex',alignItems:'center',gap:5}}>
            {icon}<span className={`text-xs font-semibold ${color}`}>{label}</span>
          </div>
        ))}
      </div>

      <div className="flex border-b border-gray-100 px-5 mt-3">
        {(['swaps','absences'] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)}
            className={`pb-2.5 px-1 mr-5 text-sm font-semibold border-b-2 transition-colors capitalize ${activeTab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t==='swaps'?'🔄 Swaps':'📋 Absences'}
            {t==='swaps'&&(pendingIn+pendingOut)>0&&<span className="ml-1.5 bg-blue-100 text-blue-700 rounded-full text-xs px-1.5 py-0.5">{pendingIn+pendingOut}</span>}
            {t==='absences'&&pendingAbs>0&&<span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full text-xs px-1.5 py-0.5">{pendingAbs}</span>}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading?(
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin"/>
          </div>
        ):activeTab==='swaps'?(
          recentSwaps.length===0?(
            <div className="text-center py-6">
              <ArrowUpDown className="h-7 w-7 mx-auto mb-2 text-gray-200"/>
              <p className="text-sm text-gray-400">No swap requests yet</p>
            </div>
          ):(
            <div className="space-y-2">
              {recentSwaps.map(s=>{
                const isOut=!!swapsOut.find(x=>x._id===s._id);
                const other=isOut?s.requestedTo?.user?.name:s.requestedBy?.user?.name;
                const meta=swapMeta[s.status]??{label:s.status,color:'#374151',bg:'#f3f4f6'};
                return (
                  <div key={s._id} onClick={()=>navigate('/teacher/swaps')}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(other||'?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{isOut?`To ${other}`:`From ${other}`}</p>
                      <p className="text-xs text-gray-400">{s.fromSession?.courseCode} ⇌ {s.toSession?.courseCode}</p>
                    </div>
                    <span style={{background:meta.bg,color:meta.color,borderRadius:99,padding:'2px 8px',fontSize:11,fontWeight:600,flexShrink:0}}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )
        ):(
          absences.length===0?(
            <div className="text-center py-6">
              <Calendar className="h-7 w-7 mx-auto mb-2 text-gray-200"/>
              <p className="text-sm text-gray-400">No absence records</p>
            </div>
          ):(
            <div className="space-y-2">
              {absences.slice(0,4).map(a=>{
                const meta=absMeta[a.status]??{label:a.status,color:'#374151',bg:'#f3f4f6'};
                const covered=a.affectedClasses?.filter(c=>c.substituteStatus==='assigned').length??0;
                const total=a.affectedClasses?.length??0;
                return (
                  <div key={a._id} onClick={()=>navigate('/teacher/absences')}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shrink-0">
                      <BadgeAlert className="h-3.5 w-3.5 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800">{fmtDate(a.absenceDate)} · {a.dayOfWeek}</p>
                      <p className="text-xs text-gray-400">{total} classes · {covered} covered</p>
                    </div>
                    <span style={{background:meta.bg,color:meta.color,borderRadius:99,padding:'2px 8px',fontSize:11,fontWeight:600,flexShrink:0}}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )
        )}

        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button onClick={()=>navigate('/teacher/swaps')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white">
            <ArrowUpDown className="h-3 w-3"/>Swap Requests<ChevronRight className="h-3 w-3 ml-auto"/>
          </button>
          <button onClick={()=>navigate('/teacher/absences')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white"
            style={{background:'linear-gradient(135deg,#f97316,#ef4444)',border:'none',cursor:'pointer'}}>
            <BadgeAlert className="h-3 w-3"/>Mark Absence<ChevronRight className="h-3 w-3 ml-auto"/>
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TeacherDashboard: React.FC = () => {
  const navigate=useNavigate();
  const {teacher,allSessions,weeklyStats,loading,error,message}=useTeacherSchedule();
  
  const now = useMemo(() => new Date(), []);
  
  // LIVE DYNAMIC DAILY SCHEDULE STATES
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);

  // Fetch true dynamic daily schedule (includes swaps + subs)
  useEffect(() => {
    const fetchDaily = async () => {
      setDailyLoading(true);
      try {
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const data = await apiGet<any[]>(`/teachers/daily-schedule/${todayStr}`);
        
        const mapped: TodayClass[] = data.map(c => {
          const [sh,sm] = c.startTime.split(':').map(Number);
          const [eh,em] = c.endTime.split(':').map(Number);
          
          const start = new Date(); start.setHours(sh,sm,0,0);
          const end = new Date(); end.setHours(eh,em,0,0);
          const status: TodayClass['status'] = now < start ? 'upcoming' : now > end ? 'completed' : 'ongoing';
          
          return {
            id: `${c.startTime}-${c.course?.courseCode || 'SUB'}`,
            subject: c.course?.name || 'Unknown Course',
            subjectCode: c.course?.courseCode || 'N/A',
            timeSlot: `${c.startTime}–${c.endTime}`,
            room: c.room?.roomNumber || 'TBA',
            type: c.type?.toLowerCase() === 'lab' ? 'practical' : 'lecture',
            status,
            // Only regular assigned classes can be swapped, you can't swap a sub duty
            canSwap: status !== 'completed' && c.status === 'Regular', 
            dynamicStatus: c.status 
          };
        });
        
        setTodayClasses(mapped);
      } catch (err) {
        console.error("Error fetching dynamic daily schedule:", err);
      }
      setDailyLoading(false);
    };
    fetchDaily();
  }, [now]);

  const subjectProgress=useMemo(()=>toSubjectProgress(allSessions,now),[allSessions, now]);
  const nextClass=useMemo(()=>todayClasses.find(c=>c.status==='upcoming')??null,[todayClasses]);
  const completedToday=todayClasses.filter(c=>c.status==='completed').length;
  const totalDone=subjectProgress.reduce((a,s)=>a+s.completedLectures,0);
  const totalAll=subjectProgress.reduce((a,s)=>a+s.totalLectures,0);
  const completionRate=totalAll>0?Math.round((totalDone/totalAll)*100):0;
  const [showTimetable,setShowTimetable]=useState(false);

  if(loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div>;
  if(error) return <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex gap-3"><AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5"/><div><p className="font-semibold text-red-700">Failed to load dashboard</p><p className="text-sm text-red-600 mt-1">{error}</p></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center"><User className="h-8 w-8 text-white"/></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{greeting()}, {teacher?.name?.split(' ')[0]||'Teacher'}!</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-blue-100 text-sm">
                {teacher?.department&&<span className="flex items-center gap-1"><Building2 className="h-4 w-4"/>{teacher.department}</span>}
                {teacher?.employeeId&&<span className="flex items-center gap-1"><GraduationCap className="h-4 w-4"/>{teacher.employeeId}</span>}
              </div>
              <p className="text-blue-200 text-sm mt-1">{now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
            </div>
          </div>
          <Button variant="outline" className="bg-white bg-opacity-20 border-white border-opacity-30 text-white hover:bg-white hover:bg-opacity-30" onClick={()=>navigate('/teacher/schedule')}>
            <Calendar className="h-4 w-4 mr-2"/>View My Timetable
          </Button>
        </div>
      </div>

      {message&&allSessions.length===0&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3"><AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5"/><p className="text-sm text-amber-700">{message}</p></div>}

      {nextClass&&(
        <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-green-600 shrink-0"/>
              <div>
                <p className="text-sm font-medium text-green-900">
                  Next Class {nextClass.dynamicStatus !== 'Regular' && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{nextClass.dynamicStatus}</span>}
                </p>
                <p className="text-green-700">{nextClass.subject} ({nextClass.subjectCode}) · {nextClass.timeSlot} · {nextClass.room}</p>
              </div>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={()=>navigate('/teacher/schedule')}>View Schedule</Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {label:"Today's Classes",value:todayClasses.length,sub:`${completedToday} completed`,color:'blue',Icon:Calendar},
          {label:'Subjects Teaching',value:subjectProgress.length,sub:teacher?.department||'This week',color:'green',Icon:BookOpen},
          {label:'Total Sessions',value:weeklyStats?.totalSessions??0,sub:`${weeklyStats?.totalHours??0}h this week`,color:'purple',Icon:Clock},
          {label:'Completion Rate',value:`${completionRate}%`,sub:`${totalDone}/${totalAll} sessions`,color:'orange',Icon:TrendingUp},
        ].map(({label,value,sub,color,Icon})=>(
          <Card key={label} className={`p-6 bg-gradient-to-br from-${color}-50 to-${color}-100 border-${color}-200`}>
            <div className="flex items-center justify-between">
              <div><p className={`text-sm font-medium text-${color}-600`}>{label}</p><p className={`text-3xl font-bold text-${color}-900`}>{value}</p><p className={`text-xs text-${color}-500 mt-1`}>{sub}</p></div>
              <div className={`bg-${color}-500 p-3 rounded-full`}><Icon className="h-6 w-6 text-white"/></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Schedule + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Today's Schedule
              {dailyLoading && <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />}
            </h3>
            <Button size="sm" variant="outline" onClick={()=>navigate('/teacher/schedule')}><RefreshCw className="h-4 w-4 mr-1"/>Full View</Button>
          </div>
          
          {!dailyLoading && todayClasses.length===0?(
            <div className="flex flex-col items-center justify-center py-10 text-center"><Calendar className="h-10 w-10 text-gray-300 mb-2"/><p className="text-gray-500 font-medium">No classes today</p><p className="text-gray-400 text-sm">Enjoy your free day!</p></div>
          ): (
            <div className="space-y-3">
              {todayClasses.map(cls=>(
                <div key={cls.id} className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${cls.dynamicStatus === 'Substitute' ? 'bg-orange-50/50 border-orange-200' : cls.dynamicStatus === 'Swapped In' ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColor(cls.status)}`}>{cls.status}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor(cls.type)}`}>{cls.type}</span>
                      
                      {/* NEW DYNAMIC BADGE */}
                      {cls.dynamicStatus && cls.dynamicStatus !== 'Regular' && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          cls.dynamicStatus === 'Swapped In' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {cls.dynamicStatus}
                        </span>
                      )}
                    </div>
                    {cls.status==='completed'&&<CheckCircle className="h-5 w-5 text-green-500"/>}
                  </div>
                  <h4 className="font-medium text-gray-900">{cls.subject}</h4>
                  <p className="text-sm text-gray-600 mb-2">{cls.subjectCode}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{cls.timeSlot}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{cls.room}</span>
                  </div>
                  {cls.canSwap&&(
                    <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-gray-200/60">
                      <Button size="sm" variant="outline" className="text-xs" onClick={()=>navigate('/teacher/swaps')}><ArrowUpDown className="h-3 w-3 mr-1"/>Request Swap</Button>
                      <Button size="sm" variant="outline" className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={()=>navigate('/teacher/absences')}><BadgeAlert className="h-3 w-3 mr-1"/>Report Absence</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Progress</h3>
          {subjectProgress.length===0?(
            <div className="flex flex-col items-center justify-center py-10 text-center"><BookOpen className="h-10 w-10 text-gray-300 mb-2"/><p className="text-gray-500 font-medium">No subjects found</p></div>
          ):(
            <div className="space-y-4">
              {subjectProgress.map(s=>{
                const pct=s.totalLectures>0?Math.round((s.completedLectures/s.totalLectures)*100):0;
                return (
                  <div key={s.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div><h4 className="font-medium text-gray-900">{s.name}</h4><p className="text-sm text-gray-600">{s.code} · Sem {s.semester}</p></div>
                      <div className="text-right"><p className="text-sm font-medium">{s.completedLectures}/{s.totalLectures}</p><p className="text-xs text-gray-500">{s.credits} credits</p></div>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Progress</span><span className="font-medium">{pct}%</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-2"><div className={`h-2 rounded-full transition-all duration-300 ${progressColor(pct)}`} style={{width:`${pct}%`}}/></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor(s.type)}`}>{s.type}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Target className="h-3 w-3 text-gray-400"/>{s.totalLectures-s.completedLectures} remaining</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions + This Week + Live Swap/Absence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/teacher/schedule')}><Calendar className="h-4 w-4 mr-2"/>View Full Schedule</Button>
            <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/teacher/classes')}><BookOpen className="h-4 w-4 mr-2"/>My Classes</Button>
            <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/teacher/swaps')}><ArrowUpDown className="h-4 w-4 mr-2"/>Swap Requests</Button>
            <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/teacher/absences')}><BadgeAlert className="h-4 w-4 mr-2"/>Absence Requests</Button>
            <Button className="w-full justify-start" variant="outline" onClick={()=>navigate('/teacher/profile')}><User className="h-4 w-4 mr-2"/>My Profile</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week</h3>
          <div className="space-y-3">
            {[
              {label:'Theory Sessions',value:weeklyStats?.theoryClasses??0,color:'blue'},
              {label:'Lab Sessions',value:weeklyStats?.labClasses??0,color:'purple'},
              {label:'Total Hours',value:`${weeklyStats?.totalHours??0}h`,color:'green'},
              {label:'Working Days',value:weeklyStats?.workingDays??0,color:'orange'},
            ].map(({label,value,color})=>(
              <div key={label} className={`flex items-center justify-between p-3 bg-${color}-50 rounded-lg`}>
                <span className={`text-sm font-medium text-${color}-900`}>{label}</span>
                <span className={`text-lg font-bold text-${color}-700`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <AbsenceSwapStatusPanel/>
      </div>

      {/* Today's Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
        {todayClasses.length===0?(
          <p className="text-sm text-gray-400 text-center py-4">No classes today</p>
        ):(
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayClasses.map(cls=>(
              <div key={cls.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cls.status==='completed'?'bg-green-100':cls.status==='ongoing'?'bg-blue-100':'bg-yellow-100'}`}>
                  {cls.status==='completed'?<CheckCircle className="h-4 w-4 text-green-600"/>:<Clock className={`h-4 w-4 ${cls.status==='ongoing'?'text-blue-600':'text-yellow-600'}`}/>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {cls.subjectCode} {cls.dynamicStatus !== 'Regular' && '*'}
                  </p>
                  <p className="text-xs text-gray-500">{cls.timeSlot} · {cls.room}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showTimetable&&(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Timetable Generator</h2>
              <Button variant="outline" onClick={()=>setShowTimetable(false)}>✕</Button>
            </div>
            <div className="p-6"><TimetableGenerator/></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;