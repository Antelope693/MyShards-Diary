
import { useEffect, useState } from 'react';
import { collectionsApi } from '../api/client';
import type { Collection, Diary } from '../api/client';
import { Card } from './ui/Card';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DiaryCardContent } from './DiaryCardContent';

interface CollectionModalProps {
    collection: Collection;
    onClose: () => void;
}

export default function CollectionModal({ collection, onClose }: CollectionModalProps) {
    const [diaries, setDiaries] = useState<Diary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await collectionsApi.getById(collection.id);
                if (data.data.diaries) {
                    setDiaries(data.data.diaries);
                }
            } catch (e) {
                console.error('Failed to load collection diaries', e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [collection.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">

                {/* Header Image */}
                <div className="relative h-48 sm:h-64 flex-shrink-0 bg-gray-100">
                    {collection.cover_image ? (
                        <img src={collection.cover_image} className="w-full h-full object-cover" alt={collection.title} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600" />
                    )}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
                        <h2 className="text-3xl sm:text-4xl font-title font-bold mb-2">{collection.title}</h2>
                        {collection.description && <p className="text-gray-200 text-sm sm:text-base max-w-2xl">{collection.description}</p>}
                    </div>
                </div>

                {/* Content - Inner Timeline */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-gray-50/50">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : diaries.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            合集中暂时没有日记
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-indigo-100 pl-6 sm:pl-10 space-y-12 ml-2 sm:ml-4">
                            {diaries.map(diary => (
                                <div key={diary.id} className="relative group">
                                    <div className="absolute -left-[33px] sm:-left-[49px] top-6 bg-white border-2 border-indigo-200 w-4 h-4 rounded-full group-hover:border-indigo-500 group-hover:scale-125 transition-all" />
                                    <Link to={`/diary/${diary.id}`} onClick={onClose} className="block hover:-translate-y-1 transition-transform duration-300">
                                        <Card noPadding className="shadow-sm hover:shadow-md">
                                            <DiaryCardContent diary={diary} isPinned={diary.is_pinned} />
                                        </Card>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
