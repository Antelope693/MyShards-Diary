import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../contexts/AuthContext';

export default function TutorialManager() {
    const { user } = useAuth();

    useEffect(() => {
        // Listen for manual trigger
        const handleTrigger = () => {
            startTutorial();
        };
        window.addEventListener('trigger-tutorial', handleTrigger);

        // Auto-start for new users (check localStorage)
        const hasSeen = localStorage.getItem('tutorial_v1_seen');
        if (user && !hasSeen) {
            // Delay slightly to allow UI to render (e.g. data fetching)
            setTimeout(() => {
                startTutorial();
            }, 1500);
        }

        return () => {
            window.removeEventListener('trigger-tutorial', handleTrigger);
        };
    }, [user]);

    const startTutorial = () => {
        const driverObj = driver({
            showProgress: true,
            allowClose: false,
            nextBtnText: '下一步',
            prevBtnText: '上一步',
            doneBtnText: '完成教程',
            onDestroyed: () => {
                localStorage.setItem('tutorial_v1_seen', 'true');
                alert('恭喜完成新手引导！\n\n您可以随时在“创作者 - 更多功能”中再次查看此教程。');
            },
            steps: [
                {
                    element: '#tour-home-logo',
                    popover: {
                        title: '欢迎来到 MyShards Diary',
                        description: '这是一个属于你的时空碎片记录站。点击这里随时回到首页。',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tour-nav-we',
                    popover: {
                        title: '我们 (We)',
                        description: '探索在这里书写的其他伙伴，找到志同道合的同行者。',
                        side: 'right',
                        align: 'center'
                    }
                },
                {
                    element: '#tour-nav-they',
                    popover: {
                        title: '他们 (They)',
                        description: '随机漫游碎片的海洋，发现遗落在风中的故事。支持热门、最新和随机浏览。',
                        side: 'right',
                        align: 'center'
                    }
                },
                {
                    element: '#tour-timeline',
                    popover: {
                        title: '时间轴与日记',
                        description: '这是你的主舞台。所有的日记、收藏都会按时间顺序在这里流淌。',
                        side: 'top',
                        align: 'start'
                    }
                },
                {
                    element: '#tour-backend-btn',
                    popover: {
                        title: '创作与后台',
                        description: '点击这里进入“后台”或“维护台”，开始书写日记或管理你的空间。',
                        side: 'left',
                        align: 'center'
                    }
                },
                {
                    element: 'nav button.bg-purple-50', // Heuristic selector for user badge
                    popover: {
                        title: '更多功能',
                        description: '点击你的昵称，可以查看“我的收藏”、“我的关注”，以及“我的生涯”。\n\n协作功能允许你邀请好友共同书写日记。\n\n你可以在这里重新进行新手教程Owo',
                        side: 'bottom',
                        align: 'end'
                    }
                }
            ]
        });

        driverObj.drive();
    };

    return null;
}
