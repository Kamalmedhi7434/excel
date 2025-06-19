// Excel Dashboard JavaScript
class ExcelDashboard {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api/dashboard';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }

    async handleFileUpload(file) {
        // Validate file type
        const allowedTypes = ['.xlsx', '.xls', '.csv'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showError('Invalid file format. Please upload Excel (.xlsx, .xls) or CSV files.');
            return;
        }

        // Validate file size (16MB limit)
        if (file.size > 16 * 1024 * 1024) {
            this.showError('File size too large. Please upload files smaller than 16MB.');
            return;
        }

        this.showLoading();
        this.clearError();

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.displayDashboard(result);
            } else {
                this.showError(result.error || 'An error occurred while processing the file.');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async loadSampleData() {
        this.showLoading();
        this.clearError();

        try {
            const response = await fetch(`${this.apiBaseUrl}/sample-data`);
            const result = await response.json();

            if (result.success) {
                this.displayDashboard(result);
            } else {
                this.showError(result.error || 'An error occurred while loading sample data.');
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    displayDashboard(data) {
        // Hide upload section and show dashboard
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('dashboard').classList.add('show', 'fade-in');

        // Update file info
        document.getElementById('fileName').textContent = `📁 ${data.filename}`;
        document.getElementById('fileStats').textContent = 
            `📊 ${data.basic_info.rows} rows, ${data.basic_info.columns} columns`;

        // Display statistics
        this.displayStatistics(data);

        // Display charts
        this.displayCharts(data.charts);

        // Display data table
        this.displayDataTable(data.sample_data);
    }

    displayStatistics(data) {
        const statsGrid = document.getElementById('statsGrid');
        const basicInfo = data.basic_info;
        const missingValues = data.missing_values;
        const numericStats = data.numeric_stats;

        // Calculate statistics
        const totalMissing = Object.values(missingValues).reduce((sum, val) => sum + val, 0);
        const numericColumns = Object.keys(numericStats).length;
        const categoricalColumns = basicInfo.columns - numericColumns;

        const stats = [
            { label: 'Total Rows', value: basicInfo.rows, icon: 'fas fa-list' },
            { label: 'Total Columns', value: basicInfo.columns, icon: 'fas fa-columns' },
            { label: 'Numeric Columns', value: numericColumns, icon: 'fas fa-calculator' },
            { label: 'Text Columns', value: categoricalColumns, icon: 'fas fa-font' },
            { label: 'Missing Values', value: totalMissing, icon: 'fas fa-exclamation-triangle' },
            { label: 'Data Quality', value: `${Math.round((1 - totalMissing / (basicInfo.rows * basicInfo.columns)) * 100)}%`, icon: 'fas fa-check-circle' }
        ];

        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-item slide-up">
                <i class="${stat.icon}" style="font-size: 1.5rem; color: #667eea; margin-bottom: 10px;"></i>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    displayCharts(charts) {
        const chartsGrid = document.getElementById('chartsGrid');
        chartsGrid.innerHTML = '';

        const chartTypes = [
            { key: 'pie_chart', title: 'Distribution Analysis', icon: 'fas fa-chart-pie' },
            { key: 'bar_chart', title: 'Count Analysis', icon: 'fas fa-chart-bar' },
            { key: 'histogram', title: 'Distribution Pattern', icon: 'fas fa-chart-area' },
            { key: 'line_chart', title: 'Trend Analysis', icon: 'fas fa-chart-line' },
            { key: 'scatter_plot', title: 'Relationship Analysis', icon: 'fas fa-braille' },
            { key: 'heatmap', title: 'Correlation Matrix', icon: 'fas fa-th' },
            { key: 'box_plot', title: 'Statistical Distribution', icon: 'fas fa-square' }
        ];

        chartTypes.forEach((chartType, index) => {
            if (charts[chartType.key]) {
                const chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container slide-up';
                chartContainer.style.animationDelay = `${index * 0.1}s`;
                
                chartContainer.innerHTML = `
                    <div class="chart-title">
                        <i class="${chartType.icon}"></i> ${chartType.title}
                    </div>
                    <div id="chart-${chartType.key}" style="height: 400px;"></div>
                `;
                
                chartsGrid.appendChild(chartContainer);

                // Render chart with Plotly
                setTimeout(() => {
                    Plotly.newPlot(`chart-${chartType.key}`, charts[chartType.key].data, charts[chartType.key].layout, {
                        responsive: true,
                        displayModeBar: true,
                        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                        displaylogo: false
                    });
                }, 100);
            }
        });
    }

    displayDataTable(sampleData) {
        const container = document.getElementById('dataTableContainer');
        
        if (!sampleData || sampleData.length === 0) {
            container.innerHTML = '<p>No data to display</p>';
            return;
        }

        const headers = Object.keys(sampleData[0]);
        
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${sampleData.map(row => `
                        <tr>
                            ${headers.map(header => `<td>${this.formatCellValue(row[header])}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = tableHTML;
    }

    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '<span style="color: #a0aec0; font-style: italic;">null</span>';
        }
        
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        
        return String(value);
    }

    showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    showError(message) {
        const errorDisplay = document.getElementById('errorDisplay');
        errorDisplay.innerHTML = `
            <div class="error fade-in">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
    }

    clearError() {
        document.getElementById('errorDisplay').innerHTML = '';
    }

    resetDashboard() {
        // Hide dashboard and show upload section
        document.getElementById('dashboard').classList.remove('show');
        document.getElementById('uploadSection').style.display = 'block';
        
        // Clear file input
        document.getElementById('fileInput').value = '';
        
        // Clear any errors
        this.clearError();
        
        // Add animation
        document.getElementById('uploadSection').classList.add('fade-in');
    }
}

// Global functions for HTML onclick events
function loadSampleData() {
    dashboard.loadSampleData();
}

function resetDashboard() {
    dashboard.resetDashboard();
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new ExcelDashboard();
    
    // Add some interactive effects
    addInteractiveEffects();
});

function addInteractiveEffects() {
    // Add hover effects to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add parallax effect to header
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const header = document.querySelector('.header');
        if (header) {
            header.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });

    // Add typing effect to subtitle
    const subtitle = document.querySelector('.header .subtitle');
    if (subtitle) {
        const text = subtitle.textContent;
        subtitle.textContent = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < text.length) {
                subtitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        };
        
        setTimeout(typeWriter, 1000);
    }
}

// Add some utility functions for enhanced UX
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        ${message}
    `;
    
    // Add toast styles if not already present
    if (!document.querySelector('.toast-styles')) {
        const style = document.createElement('style');
        style.className = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            }
            .toast-success { border-left: 4px solid #48bb78; }
            .toast-error { border-left: 4px solid #e53e3e; }
            .toast-info { border-left: 4px solid #667eea; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

