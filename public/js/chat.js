// Chat functionality for chat.html

const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');

// Predefined responses for demo purposes
const chatResponses = {
    en: {
        greeting: ["Hello! How can I assist you today?", "Hi there! What can I help you with?", "Welcome! How may I help you?"],
        transfer: "Our money transfer service allows you to send money to over 100 countries. Transfers typically complete within minutes. Would you like to know about specific destinations or fees?",
        rates: "We offer competitive exchange rates updated in real-time. You can check current rates on our Services page or I can help you with a specific currency pair.",
        fees: "Our transaction fees are very competitive. Fees vary by destination and amount. Most transfers have a flat fee of $5-10. Would you like details for a specific country?",
        account: "I'd be happy to help with account issues. Could you please provide more details about the problem you're experiencing?",
        crypto: "We support major cryptocurrencies including Bitcoin, Ethereum, USDT, and more. You can buy, sell, or exchange crypto through our platform. What would you like to know?",
        default: "I understand you need help with that. Our team is here to assist you. Could you provide more details so I can better help you?",
        thanks: ["You're welcome! Is there anything else I can help you with?", "Happy to help! Feel free to ask if you have more questions.", "My pleasure! Let me know if you need anything else."]
    },
    so: {
        greeting: ["Salaan! Sidee kaa caawin karaa maanta?", "Salaan! Maxaan kaa caawin karaa?", "Soo dhawoow! Sidee kaa caawin karaa?"],
        transfer: "Adeegayaga lacag gudbinta wuxuu kuu oggolaanayaa inaad lacag u dirto in ka badan 100 waddan. Gudbintu waxay ka qeybgelisaa daqiiqado gudahood. Ma jeclaan lahayd inaad ogaato meelo gaar ah ama khidmad?",
        rates: "Waxaan bixinaa qiimaha sarifka tartanka leh ee la cusboonaysiiyay waqti dhabta ah. Waxaad ka hubin kartaa qiimaha hadda jira bogga Adeegyadayada ama waan kaa caawin karaa lacag gaar ah.",
        fees: "Khidmadaha macaamilkayagu aad ayey u tartamayaan. Khidmadaha way kala duwan yihiin meel iyo qaddar. Inta badan gudbinta waxay leedahay khidmad go'an oo $5-10. Ma jeclaan lahayd faahfaahin waddan gaar ah?",
        account: "Waan ku farxi lahaa inaan kaaga caawiyo dhibaatooyinka koontada. Fadlan ma ii bixin kartaa faahfaahin dheeri ah oo ku saabsan dhibaatada aad la kulantay?",
        crypto: "Waxaan taageernaa lacagaha cryptocurrency-ga ugu muhiimsan oo ay ka mid yihiin Bitcoin, Ethereum, USDT, iyo kuwo kale. Waxaad ku iibin kartaa, iibsan kartaa, ama bedeli kartaa crypto aaladdayada. Maxaad jeclaan lahayd inaad ogaato?",
        default: "Waan fahmay inaad u baahan tahay caawimaad taas. Kooxdayadu waa halkan si ay kaaga caawiso. Ma ii bixin kartaa faahfaahin dheeri ah si aan si fiican kuugu caawiyo?",
        thanks: ["Waad ku mahadsan tahay! Ma jiraa wax kale oo aan kaa caawin karo?", "Waan ku faraxsan nahay inaan kaaga caawino! Fadlan weydiiso haddii aad qabto su'aalo dheeraad ah.", "Waa farxad! Ii sheeg haddii aad u baahan tahay wax kale."]
    }
};

// Initialize chat
let messageCount = 1;

if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        
        if (message) {
            addMessage(message, 'user');
            chatInput.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            // Simulate bot response after delay
            setTimeout(() => {
                hideTypingIndicator();
                const response = generateResponse(message);
                addMessage(response, 'bot');
            }, 1000 + Math.random() * 1000);
        }
    });
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = `<p>${text}</p>`;
    
    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    content.appendChild(bubble);
    content.appendChild(time);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    messageCount++;
}

function showTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.style.display = 'flex';
    }
}

function hideTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

function generateResponse(message) {
    const lang = currentLanguage || 'en';
    const responses = chatResponses[lang];
    const lowerMessage = message.toLowerCase();
    
    // Check for keywords and return appropriate response
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('salaan')) {
        return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    } else if (lowerMessage.includes('transfer') || lowerMessage.includes('send money') || lowerMessage.includes('lacag') || lowerMessage.includes('gudbinta')) {
        return responses.transfer;
    } else if (lowerMessage.includes('rate') || lowerMessage.includes('exchange') || lowerMessage.includes('qiimo') || lowerMessage.includes('sarif')) {
        return responses.rates;
    } else if (lowerMessage.includes('fee') || lowerMessage.includes('cost') || lowerMessage.includes('charge') || lowerMessage.includes('khidmad')) {
        return responses.fees;
    } else if (lowerMessage.includes('account') || lowerMessage.includes('login') || lowerMessage.includes('koonto')) {
        return responses.account;
    } else if (lowerMessage.includes('crypto') || lowerMessage.includes('bitcoin') || lowerMessage.includes('digital')) {
        return responses.crypto;
    } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('mahadsanid')) {
        return responses.thanks[Math.floor(Math.random() * responses.thanks.length)];
    } else {
        return responses.default;
    }
}

// Handle quick topic buttons
const topicBtns = document.querySelectorAll('.topic-btn');
topicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const topic = btn.getAttribute('data-topic');
        const topicText = btn.textContent;
        
        addMessage(topicText, 'user');
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            const response = generateTopicResponse(topic);
            addMessage(response, 'bot');
        }, 1000);
    });
});

// Handle FAQ items
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    item.addEventListener('click', () => {
        const question = item.querySelector('p').textContent;
        
        addMessage(question, 'user');
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            const response = generateResponse(question);
            addMessage(response, 'bot');
        }, 1000);
    });
});

function generateTopicResponse(topic) {
    const lang = currentLanguage || 'en';
    const responses = chatResponses[lang];
    
    switch (topic) {
        case 'transfer':
            return responses.transfer;
        case 'rates':
            return responses.rates;
        case 'fees':
            return responses.fees;
        case 'account':
            return responses.account;
        case 'crypto':
            return responses.crypto;
        default:
            return responses.default;
    }
}

// Auto-focus on chat input when page loads
if (chatInput) {
    chatInput.focus();
}

// Handle Enter key (without Shift) to send message
if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
}
