


interface TimelineGroup {
    year: number;
    months: {
        monthStr: string; // e.g., "January" or "1月"
        id: string; // Anchor ID
        label: string;
    }[];
}

interface TimelineNavigatorProps {
    groups: TimelineGroup[];
    activeId?: string;
    className?: string;
}

export default function TimelineNavigator({ groups, activeId, className = '' }: TimelineNavigatorProps) {
    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className={`fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-6 ${className}`}>
            {/* Vertical Rail Line */}
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-gradient-to-b from-transparent via-gray-200 to-transparent" />

            {groups.map((group) => (
                <div key={group.year} className="flex flex-col items-end gap-2 group relative pr-6">
                    <div className="text-3xl font-black transition-colors duration-300 font-title select-none">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600">
                            {group.year}
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {group.months.map((month) => {
                            const isActive = activeId === month.id; // Logic to determine if active
                            return (
                                <button
                                    key={month.id}
                                    onClick={() => scrollToId(month.id)}
                                    className={`text-sm font-bold transition-all duration-300 py-1 px-3 rounded-full backdrop-blur-sm
                    ${isActive
                                            ? 'text-white bg-indigo-500 shadow-md scale-110 origin-right'
                                            : 'text-indigo-400/60 bg-indigo-50/50 hover:bg-indigo-500/80 hover:text-white hover:scale-105 origin-right'
                                        }
                  `}
                                >
                                    {month.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
