import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'

export default function DashboardLayout() {
    return (
        <div style={s.layout}>
            <Sidebar />
            <main style={s.main}>
                <div style={s.content}>
                    <Outlet />
                </div>
            </main>
        </div>
    )
}

const s: Record<string, React.CSSProperties> = {
    layout: {
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
    },
    main: {
        flex: 1,
        overflow: 'auto',
        minWidth: 0,
    },
    content: {
        padding: '32px',
        maxWidth: '1200px',
        margin: '0 auto',
    },
}