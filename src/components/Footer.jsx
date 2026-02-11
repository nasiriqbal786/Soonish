import packageJson from '../../package.json'
import './Footer.css'

function Footer() {
    return (
        <footer className="app-footer">
            <div className="copyright">© BuildNex.Tech 2026</div>
            <div className="version">v{packageJson.version}</div>
        </footer>
    )
}

export default Footer
