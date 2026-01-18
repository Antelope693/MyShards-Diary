
import { Diary } from '../api/client';
import { Calendar, Pin, Lock, MessageSquare } from 'lucide-react';

interface DiaryCardContentProps {
    diary: Diary;
    isPinned?: boolean;
}

export const DiaryCardContent = ({ diary, isPinned = false }: DiaryCardContentProps) => {
    return (
        <>
            {diary.cover_image && (
                <div className="relative h-48 sm:h-64 overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
                    <img
                        src={diary.cover_image}
                        alt={diary.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            )}
            <div className={`p-5 sm:p-8 ${diary.cover_image ? '' : 'pt-8'}`}>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-title text-2xl sm:text-3xl font-black text-gray-800 line-clamp-1 group-hover:text-purple-600 transition-colors tracking-tight">
                        {diary.title}
                    </h3>
                    <div className="flex gap-1.5 flex-shrink-0 pt-1">
                        {isPinned && <Pin className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        {diary.is_locked && <Lock className="w-4 h-4 text-purple-500" />}
                        {diary.editors && diary.editors.length > 0 && <MessageSquare className="w-4 h-4 text-indigo-500" />}
                    </div>
                </div>

                <div className="flex items-center text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider space-x-2">
                    {isPinned && (
                        <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1">
                            <Pin className="w-3 h-3 fill-amber-600" /> 置顶
                        </span>
                    )}
                    <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(diary.created_at).toLocaleDateString()}
                    </div>
                </div>

                <p className="text-gray-600 line-clamp-3 text-sm leading-relaxed mb-6 font-body">
                    {diary.content.replace(/\[img:[^\]]+\]/g, '[图片]').replace(/#{1,6}\s/g, '').substring(0, 100)}...
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100/50">
                    <div className="flex items-center space-x-2">
                        {diary.owner && (
                            <>
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600 text-xs font-bold border border-white shadow-sm ring-1 ring-purple-50">
                                    {diary.owner.username?.[0]?.toUpperCase()}
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{diary.owner.display_name || diary.owner.username}</span>
                            </>
                        )}
                    </div>
                    <span className="text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform text-sm flex items-center">
                        阅读全文 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </span>
                </div>
            </div>
        </>
    );
};
