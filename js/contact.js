BASH.renderContactPage = function() {
    const mainContent = document.getElementById('mainContent');
    
    const socialLinks = [
        { name: 'WhatsApp', icon: 'fab fa-whatsapp', link: BASH_CONFIG.SOCIAL.whatsapp, color: '#25D366' },
        { name: 'WhatsApp Channel', icon: 'fab fa-whatsapp', link: BASH_CONFIG.SOCIAL.whatsapp, color: '#25D366' },
        { name: 'LinkedIn', icon: 'fab fa-linkedin', link: BASH_CONFIG.SOCIAL.linkedin, color: '#0077B5' },
        { name: 'Instagram', icon: 'fab fa-instagram', link: BASH_CONFIG.SOCIAL.instagram, color: '#E4405F' },
        { name: 'Email', icon: 'fas fa-envelope', link: BASH_CONFIG.SOCIAL.email, color: '#D44638' },
        { name: 'GitHub', icon: 'fab fa-github', link: BASH_CONFIG.SOCIAL.github, color: '#333333' },
        { name: 'Kaggle', icon: 'fab fa-kaggle', link: BASH_CONFIG.SOCIAL.kaggle, color: '#20BEFF' }
    ];
    
    
    let html = '<div class="section-title">📞 Contact BASH</div>';
    html += '<p style="margin-bottom:20px; color:var(--dark-gray);">Connect with us on any platform!</p>';
    html += '<div class="contact-grid">';
    
    socialLinks.forEach(link => {
        html += `
            <a href="${link.link}" target="_blank" class="contact-card fade-in">
                <div class="contact-icon" style="color:${link.color};">
                    <i class="${link.icon}"></i>
                </div>
                <div class="contact-name">${link.name}</div>
            </a>
        `;
    });
    
    html += '</div>';
    
    html += `
        <div class="contribute-cta">
            <h3>Want to Contribute?</h3>
            <p>Share exam papers, notes, or resources with fellow students!</p>
            <button onclick="BASH.navigateTo('contribute')" class="contribute-btn">
                <i class="fas fa-hand-holding-heart"></i> Contribute Now
            </button>
        </div>
    `;
    
    mainContent.innerHTML = html;
};