let lastParsedFields = {};

function flattenJsonLevel2(json) {
    const flat = {};
    for (const level1Key in json) {
        const nested = json[level1Key];
        if (typeof nested === 'object' && nested !== null) {
            for (const key in nested) {
                const value = nested[key];
                if (typeof value === 'string' || value === null) {
                    flat[key] = 'String';
                    flat[key + 'Name'] = 'String';
                } else if (typeof value === 'number') {
                    flat[key] = 'Integer';
                    flat[key + 'Name'] = 'String';
                } else if (Array.isArray(value)) {
                    if (value.every(v => typeof v === 'string')) {
                        flat[key] = 'List<String>';
                        flat[key + 'Name'] = 'String';
                    }
                }
            }
        }
    }
    return flat;
}

function showLoading(buttonElement) {
    if (!buttonElement) return;
    const originalText = buttonElement.innerHTML;
    buttonElement.innerHTML = originalText + '<span class="loading"></span>';
    buttonElement.disabled = true;
    setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
    }, 1000);
}

function handleProcess() {
    const button = document.querySelector('.btn-group button');
    showLoading(button);
    // Xử lý dữ liệu
    generateClass(false); // Không show loading riêng lẻ
    generateJasperField(false);
    generateSampleXml(false);
}

function generateClass(showLoadingFlag = true) {
    if (showLoadingFlag) {
        const button = document.querySelector('.btn-group button');
        showLoading(button);
    }
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const inputText = document.getElementById('jsonInput').value.trim();
    const className = document.getElementById('className').value.trim() || 'GeneratedClass';
    const xmlRoot = document.getElementById('xmlRoot').value.trim() || 'ROOT';
    if (direction === 'jsonToClass') {
        let json;
        try {
            json = JSON.parse(inputText);
        } catch (e) {
            // alert('❌ JSON không hợp lệ! Vui lòng kiểm tra lại.');
            showNotification('JSON không hợp lệ! Vui lòng kiểm tra lại', 'error');
            return;
        }
        const flatFields = flattenJsonLevel2(json);
        lastParsedFields = flatFields;
        let fieldsStr = '';
        for (const [key, type] of Object.entries(flatFields)) {
            fieldsStr += `    private ${type} ${key};\n`;
        }
        const classStr = `@AllArgsConstructor\n@NoArgsConstructor\n@Data\n@Builder\n@XmlRootElement(name = "${xmlRoot}")\n@JsonIgnoreProperties(ignoreUnknown = true)\n@XmlAccessorType(XmlAccessType.FIELD)\npublic class ${className} implements Serializable {\n${fieldsStr}}`;
        document.getElementById('classOutput').textContent = classStr;
        showNotification('Đã tạo class thành công!', 'success');
    } else if (direction === 'classToJson') {
        const fieldLines = inputText.split('\n').filter(line => line.includes('private'));
        const flatFields = {};
        for (const line of fieldLines) {
            const match = line.match(/private\s+([\w<>]+)\s+(\w+);/);
            if (match) {
                const [, type, name] = match;
                flatFields[name] = type;
            }
        }
        lastParsedFields = flatFields;
        let jsonExample = {};
        for (const key in flatFields) {
            jsonExample[key] = flatFields[key].startsWith('List') ? [] : '';
        }
        document.getElementById('classOutput').textContent = JSON.stringify({ [className]: jsonExample }, null, 2);
        showNotification('Đã phân tích class thành JSON!', 'success');
    }
}

function generateJasperField(showLoadingFlag = true) {
    if (showLoadingFlag) {
        const button = document.querySelector('.btn-group button');
        showLoading(button);
    }
    if (Object.keys(lastParsedFields).length === 0) {
        generateClass(false);
    }
    const fields = Object.entries(lastParsedFields).map(([key, type]) => {
        const cleanName = key.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        const classType = (type === 'Integer') ? 'java.lang.Integer' :
            (type === 'String') ? 'java.lang.String' :
                (type.startsWith('List')) ? 'java.util.List' : type;
        return `<field name="${cleanName}" class="${classType}"/>`;
    });
    document.getElementById('fieldOutput').textContent = fields.join('\n');
    showNotification('Đã tạo Jasper field thành công!', 'success');
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    if (text && !text.includes('sẽ hiển thị ở đây')) {
        navigator.clipboard.writeText(text).then(() => {
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Đã copy!';
            button.classList.add('success');
            showNotification(`Đã copy vào clipboard! (${elementId === 'classOutput' ? 'Class' : elementId === 'fieldOutput' ? 'Jasper Field' : 'XML'})`, 'success');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Đã copy!';
            button.classList.add('success');
            showNotification('Đã copy vào clipboard!', 'success');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('success');
            }, 2000);
        });
    } else {
        showNotification('Chưa có dữ liệu để copy!', 'warning');
    }
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    ${type === 'success' ? 'background: #48bb78;' : ''}
    ${type === 'warning' ? 'background: #ed8936;' : ''}
    ${type === 'info' ? 'background: #667eea;' : ''}
    ${type === 'error' ? 'background: #ff374b;' : ''}
  `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function generateSampleXml(showLoadingFlag = true) {
    if (showLoadingFlag) {
        const button = document.querySelector('.btn-group button');
        showLoading(button);
    }
    const className = document.getElementById('className').value.trim();
    const xmlRoot = document.getElementById('xmlRoot').value.trim() || 'ROOT';
    let jsonInput = document.getElementById('jsonInput').value.trim();
    const direction = document.querySelector('input[name="direction"]:checked').value;
    if (direction === 'classToJson') {
        // Lấy JSON từ classOutput nếu đang ở chiều classToJson
        jsonInput = document.getElementById('classOutput').textContent.trim();
    }
    if (!jsonInput || jsonInput.includes('sẽ hiển thị ở đây')) {
        showNotification('Vui lòng nhập JSON đầu vào', 'error');
        return;
    }
    try {
        const jsonData = JSON.parse(jsonInput);
        const flattened = flattenJsonLevel2(jsonData);
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${xmlRoot}>\n`;
        const sampleData = {
            'String': () => {
                const samples = ['Sample', 'Test', 'Demo', 'Example', 'Data'];
                return samples[Math.floor(Math.random() * samples.length)] + ' ' +
                    (Math.floor(Math.random() * 100) + 1);
            },
            'Integer': () => Math.floor(Math.random() * 1000) + 1,
            'Double': () => (Math.random() * 1000).toFixed(2),
            'Boolean': () => Math.random() > 0.5 ? 'true' : 'false',
            'Date': () => new Date().toISOString().split('T')[0],
            'List<String>': null
        };
        for (const [key, type] of Object.entries(flattened)) {
            if (type === 'List<String>') continue;
            const tagName = key.toUpperCase();
            const dataType = type.replace(/\[\]$/, '');
            const generator = sampleData[dataType] || sampleData['String'];
            if (generator) {
                const value = generator();
                xml += `  <${tagName}>${value}</${tagName}>\n`;
            }
        }
        xml += `</${xmlRoot}>`;
        document.getElementById('xmlOutput').innerHTML = '';
        document.getElementById('xmlOutput').textContent = xml;
        showNotification('Đã tạo XML mẫu thành công!', 'success');
    } catch (error) {
        console.error('Lỗi khi tạo XML mẫu:', error);
        showNotification('Lỗi khi xử lý dữ liệu: ' + error.message, 'error');
    }
}

document.getElementById('jsonInput').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.max(200, this.scrollHeight) + 'px';
});
