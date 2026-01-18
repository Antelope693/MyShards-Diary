import { useState, useEffect } from 'react';
import { issuesApi, Issue, usersApi } from '../api/client';
import { Card } from '../components/ui/Card';
import { MessageSquare, Send, CheckCircle2, Clock, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function QAPage() {
    const { user } = useAuth();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<number | null>(null);

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const res = await issuesApi.getAll();
            setIssues(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setSubmitting(true);
        try {
            await issuesApi.create(title, content);
            setTitle('');
            setContent('');
            fetchIssues();
            alert('反馈已提交，请耐心等待回复');
        } catch (error) {
            alert('提交失败');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (issueId: number) => {
        if (!replyContent.trim()) return;
        try {
            await issuesApi.reply(issueId, replyContent);
            setReplyContent('');
            setReplyingTo(null);
            fetchIssues();
        } catch (error) {
            alert('回复失败');
        }
    };

    const isStaff = user?.role === 'admin' || user?.role === 'maintainer';

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold text-gray-800 font-title">问题反馈与建议 (Q&A)</h1>
                <p className="text-gray-500">向维护者发送您遇到的问题或建议，我们会尽快回复。</p>
            </div>

            {/* Submission Form */}
            <Card variant="glass" className="p-6">
                <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-500" />
                    <span>提交新反馈</span>
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="简要描述问题 (标题)"
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="详细描述您遇到的情况..."
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none h-32 resize-none"
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
                        >
                            {submitting ? '发送中...' : '发送反馈'}
                        </button>
                    </div>
                </form>
            </Card>

            {/* Issues List */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-800 pl-2 border-l-4 border-indigo-400">反馈列表</h2>
                {loading ? (
                    <div className="text-center text-gray-400 py-10">加载中...</div>
                ) : issues.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">暂无反馈，快来抢沙发~</div>
                ) : (
                    issues.map(issue => (
                        <div key={issue.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold">
                                        {issue.display_name?.[0] || issue.username?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{issue.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><User size={12} /> {issue.display_name || issue.username}</span>
                                            <span>·</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(issue.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${issue.status === 'replied' ? 'bg-emerald-100 text-emerald-600' :
                                        issue.status === 'closed' ? 'bg-gray-100 text-gray-500' :
                                            'bg-amber-100 text-amber-600'
                                    }`}>
                                    {issue.status === 'replied' ? '已回复' : issue.status === 'closed' ? '已关闭' : '待处理'}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed">
                                {issue.content}
                            </div>

                            {/* Reply Section */}
                            {issue.reply_content && (
                                <div className="ml-4 pl-4 border-l-2 border-emerald-300 space-y-2">
                                    <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                        <CheckCircle2 size={14} /> 维护者回复
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {issue.reply_content}
                                    </div>
                                </div>
                            )}

                            {/* Admin Reply Input */}
                            {isStaff && !issue.reply_content && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    {replyingTo === issue.id ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={replyContent}
                                                onChange={e => setReplyContent(e.target.value)}
                                                placeholder="输入回复内容..."
                                                className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
                                            />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setReplyingTo(null)} className="px-4 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">取消</button>
                                                <button onClick={() => handleReply(issue.id)} className="px-4 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">提交回复</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setReplyingTo(issue.id)} className="text-xs text-emerald-600 hover:underline">
                                            回复此问题
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
