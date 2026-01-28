import type { Collection } from '../api/client';
import { Card } from './ui/Card';
import { ArrowRight, Layers } from 'lucide-react';

interface CollectionCardProps {
    collection: Collection;
    onClick?: () => void;
}

export default function CollectionCard({ collection, onClick }: CollectionCardProps) {
    return (
        <div className="relative group cursor-pointer" onClick={onClick}>
            {/* Stack effects */}
            <div className="absolute top-0 left-1 right-1 -mt-2 h-full bg-indigo-50/50 rounded-2xl border border-indigo-100 transform scale-[0.98] transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-100" />
            <div className="absolute top-0 left-2 right-2 -mt-4 h-full bg-purple-50/30 rounded-2xl border border-purple-100 transform scale-[0.96] transition-transform duration-300 group-hover:-translate-y-4 group-hover:scale-[0.98]" />

            <Card
                noPadding
                className="relative z-10 h-full border-indigo-100 bg-white/80 backdrop-blur-sm group-hover:shadow-xl group-hover:shadow-indigo-100/50 transition-all duration-300"
            >
                <div className="flex flex-col h-full">
                    {collection.cover_image ? (
                        <div className="relative h-48 overflow-hidden rounded-t-2xl">
                            <img
                                src={collection.cover_image}
                                alt={collection.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <div className="flex items-center gap-2 mb-1 opacity-80">
                                    <Layers className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider font-bold">Collection</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-32 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center rounded-t-2xl relative overflow-hidden">
                            <Layers className="w-12 h-12 text-indigo-200" />
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-indigo-400">
                                <span className="text-xs uppercase tracking-wider font-bold">Collection</span>
                            </div>
                        </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-title text-xl font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                            {collection.title}
                        </h3>
                        {collection.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                                {collection.description}
                            </p>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                            <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                {collection.diary_count || 0} 篇日记
                            </span>
                            <span className="text-indigo-500 group-hover:translate-x-1 transition-transform">
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
