import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function TutorialManager() {
    const { user } = useAuth();
    const { t } = useTranslation();

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
    }, [user, t]);

    const startTutorial = () => {
        const driverObj = driver({
            showProgress: true,
            allowClose: false,
            nextBtnText: t('common.next'),
            prevBtnText: t('common.prev'),
            doneBtnText: t('common.finish'),
            onDestroyed: () => {
                localStorage.setItem('tutorial_v1_seen', 'true');
                alert(t('tutorial.done_alert'));
            },
            steps: [
                {
                    element: '#tour-home-logo',
                    popover: {
                        title: t('tutorial.step_home'),
                        description: t('tutorial.step_home_desc'),
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tour-nav-we',
                    popover: {
                        title: t('tutorial.step_we'),
                        description: t('tutorial.step_we_desc'),
                        side: 'right',
                        align: 'center'
                    }
                },
                {
                    element: '#tour-nav-they',
                    popover: {
                        title: t('tutorial.step_they'),
                        description: t('tutorial.step_they_desc'),
                        side: 'right',
                        align: 'center'
                    }
                },
                {
                    element: '#tour-timeline',
                    popover: {
                        title: t('tutorial.step_timeline'),
                        description: t('tutorial.step_timeline_desc'),
                        side: 'top',
                        align: 'start'
                    }
                },
                {
                    element: '#tour-backend-btn',
                    popover: {
                        title: t('tutorial.step_backend'),
                        description: t('tutorial.step_backend_desc'),
                        side: 'left',
                        align: 'center'
                    }
                },
                {
                    element: 'nav button.bg-purple-50', // Heuristic selector for user badge
                    popover: {
                        title: t('tutorial.step_more'),
                        description: t('tutorial.step_more_desc'),
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
