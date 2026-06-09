import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">QuizOk</h3>
            <p className="footer-text">
              AI-powered quiz platform for educators and learners
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><a href="/discover">Discover</a></li>
              <li><a href="/teacher">Create Quiz</a></li>
              <li><a href="/join">Join Game</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
              <li><a href="/privacy">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} QuizOk. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
