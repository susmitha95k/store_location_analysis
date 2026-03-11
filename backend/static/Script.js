const API_BASE_URL = 'http://localhost:5000/api';

// Logout function
function logout() {
    window.location.href = "/home";
}

// Show loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="spinner"></div><p style="text-align: center;">Loading...</p>';
    }
}

// Hide loading
function hideLoading(elementId) {
    // Loading will be replaced by content in display functions
}

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.marginBottom = '20px';
    messageDiv.style.padding = '12px';
    messageDiv.style.borderRadius = '5px';
    
    if (type === 'success') {
        messageDiv.style.backgroundColor = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageDiv.style.backgroundColor = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    } else {
        messageDiv.style.backgroundColor = '#d1ecf1';
        messageDiv.style.color = '#0c5460';
        messageDiv.style.border = '1px solid #bee5eb';
    }
    
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.alert-success, .alert-error, .alert-info');
    existingMessages.forEach(msg => msg.remove());
    
    // Add new message at the top
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Upload file
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        showLoading('uploadPreview');
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayUploadPreview(data);
            // Update target column dropdown suggestion
            updateTargetColumnSuggestion(data.numeric_columns, data.columns);
            showMessage('File uploaded successfully!', 'success');
        } else {
            showMessage(data.error || 'Error uploading file', 'error');
        }
    } catch (error) {
        showMessage('Error connecting to server: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading('uploadPreview');
    }
}

// Update target column suggestion based on uploaded data
function updateTargetColumnSuggestion(numericColumns, allColumns) {
    const targetInput = document.getElementById('targetColumn');
    if (!targetInput) return;
    
    // Look for common sales/units columns
    const possibleTargets = ['Units Sold', 'Sales', 'units_sold', 'sales', 'Revenue', 'revenue'];
    let suggestedTarget = 'Units Sold'; // Default
    
    for (let col of possibleTargets) {
        if (numericColumns.includes(col)) {
            suggestedTarget = col;
            break;
        }
    }
    
    targetInput.value = suggestedTarget;
    targetInput.placeholder = `e.g., ${suggestedTarget}`;
    
    // Also update location column suggestion
    const locationInput = document.getElementById('locationColumn');
    if (locationInput && allColumns) {
        const possibleLocationCols = ['Store ID', 'Store', 'Location', 'Region', 'store_id', 'location'];
        for (let col of possibleLocationCols) {
            if (allColumns.includes(col)) {
                locationInput.value = col;
                locationInput.placeholder = `e.g., ${col}`;
                break;
            }
        }
    }
}

// Clean data
async function cleanData() {
    const method = document.getElementById('cleaningMethod').value;
    
    try {
        showLoading('cleaningResult');
        
        const response = await fetch(`${API_BASE_URL}/clean-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ method })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayCleaningResult(data);
            showMessage('Data cleaned successfully!', 'success');
        } else {
            showMessage(data.error || 'Error cleaning data', 'error');
        }
    } catch (error) {
        showMessage('Error cleaning data: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading('cleaningResult');
    }
}

// Perform EDA
async function performEDA() {
    try {
        showLoading('edaResults');
        
        const response = await fetch(`${API_BASE_URL}/eda`);
        const data = await response.json();
        
        if (data.success) {
            displayEDA(data);
            showMessage('EDA completed successfully!', 'success');
        } else {
            showMessage(data.error || 'Error performing EDA', 'error');
        }
    } catch (error) {
        showMessage('Error performing EDA: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading('edaResults');
    }
}

// Run regression
async function runRegression() {
    const target = document.getElementById('targetColumn').value;
    const modelType = document.getElementById('modelType').value;
    
    if (!target) {
        showMessage('Please enter a target column name', 'error');
        return;
    }
    
    try {
        showLoading('regressionResults');
        
        const response = await fetch(`${API_BASE_URL}/regression`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target, model_type: modelType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayRegressionResults(data);
            showMessage('Regression analysis completed successfully!', 'success');
        } else {
            showMessage(data.error || 'Error running regression', 'error');
        }
    } catch (error) {
        showMessage('Error running regression: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading('regressionResults');
    }
}

// Run sensitivity analysis
async function runSensitivityAnalysis() {
    const factor = document.getElementById('sensitivityFactor').value;
    
    if (!factor) {
        showMessage('Please enter a factor to analyze', 'error');
        return;
    }
    
    try {
        showLoading('sensitivityResults');
        
        const response = await fetch(`${API_BASE_URL}/sensitivity-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ factor })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displaySensitivityResults(data);
            showMessage('Sensitivity analysis completed successfully!', 'success');
        } else {
            showMessage(data.error || 'Error running sensitivity analysis', 'error');
        }
    } catch (error) {
        showMessage('Error running sensitivity analysis: ' + error.message, 'error');
        console.error(error);
    } finally {
        hideLoading('sensitivityResults');
    }
}

// Rank locations - FIXED VERSION
async function rankLocations() {
    const locationColumn = document.getElementById('locationColumn').value || 'Store ID';
    
    // Show loading message in the table
    const rankingBody = document.getElementById('rankingBody');
    if (rankingBody) {
        rankingBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;"> Loading location rankings...</td></tr>';
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/location-ranking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ location_column: locationColumn })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayRankingResults(data);
            showMessage('Location ranking completed successfully!', 'success');
        } else {
            if (rankingBody) {
                rankingBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">❌ Error: ${data.error || 'Unknown error'}</td></tr>`;
            }
            showMessage(data.error || 'Error ranking locations', 'error');
        }
    } catch (error) {
        if (rankingBody) {
            rankingBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: red; padding: 20px;">❌ Error: ${error.message}</td></tr>`;
        }
        showMessage('Error ranking locations: ' + error.message, 'error');
        console.error(error);
    }
}

// Display functions
function displayUploadPreview(data) {
    const previewDiv = document.getElementById('uploadPreview');
    
    let html = '<div class="upload-stats" style="margin-bottom: 20px;">';
    html += `<h3>Dataset Overview</h3>`;
    html += `<p><strong>Filename:</strong> ${data.filename}</p>`;
    html += `<p><strong>Dataset Shape:</strong> ${data.shape[0]} rows × ${data.shape[1]} columns</p>`;
    html += `<p><strong>Numeric Columns:</strong> ${data.numeric_columns.join(', ')}</p>`;
    html += '</div>';
    
    // Column information
    html += '<h4>Column Information:</h4>';
    html += '<div style="overflow-x: auto; margin-bottom: 20px;">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>Column Name</th><th>Data Type</th><th>Missing Values</th></tr></thead><tbody>';
    
    data.columns.forEach(col => {
        html += '<tr>';
        html += `<td>${col}</td>`;
        html += `<td>${data.dtypes[col]}</td>`;
        html += `<td>${data.missing_values[col]}</td>`;
        html += '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';
    
    // Data preview
    html += '<h4> Data Preview (First 10 rows):</h4>';
    html += '<div style="overflow-x: auto;">';
    html += '<table class="data-table"><thead><tr>';
    
    // Headers
    data.columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Data rows
    data.preview.forEach(row => {
        html += '<tr>';
        data.columns.forEach(col => {
            const value = row[col];
            if (value !== null && value !== undefined) {
                if (typeof value === 'number') {
                    html += `<td>${value.toFixed(2)}</td>`;
                } else {
                    html += `<td>${value}</td>`;
                }
            } else {
                html += `<td style="color: #999;">null</td>`;
            }
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '</div>';
    
    // Suggestions for next steps
    html += '<div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px;">';
    html += '<h4> Next Steps:</h4>';
    html += '<ul>';
    html += '<li>Click "Clean Data" to preprocess the data</li>';
    html += '<li>Run EDA to visualize patterns</li>';
    html += `<li>For regression, use target column: <strong>${data.numeric_columns.includes('Units Sold') ? 'Units Sold' : data.numeric_columns[0]}</strong></li>`;
    html += '</ul>';
    html += '</div>';
    
    previewDiv.innerHTML = html;
}

function displayCleaningResult(data) {
    const resultDiv = document.getElementById('cleaningResult');
    
    let html = '<div class="alert-success" style="padding: 15px; margin-bottom: 20px;">';
    html += `<p>${data.message}</p>`;
    html += `<p><strong>New Shape:</strong> ${data.shape[0]} rows × ${data.shape[1]} columns</p>`;
    html += '</div>';
    
    html += '<h4> Cleaned Data Preview (Normalized):</h4>';
    html += '<div style="overflow-x: auto;">';
    html += '<table class="data-table"><thead><tr>';
    
    if (data.preview.length > 0) {
        Object.keys(data.preview[0]).forEach(col => {
            html += `<th>${col}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        data.preview.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(val => {
                if (val !== null && val !== undefined) {
                    if (typeof val === 'number') {
                        html += `<td>${val.toFixed(3)}</td>`;
                    } else {
                        html += `<td>${val}</td>`;
                    }
                } else {
                    html += '<td>null</td>';
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div>';
    }
    
    resultDiv.innerHTML = html;
}

function displayEDA(data) {
    const edaDiv = document.getElementById('edaResults');
    
    let html = '<h3> Exploratory Data Analysis Results</h3>';
    
    // Summary statistics in cards
    html += '<div class="stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">';
    
    if (data.summary_stats) {
        const firstCols = Object.keys(data.summary_stats).slice(0, 4);
        firstCols.forEach(col => {
            const stats = data.summary_stats[col];
            html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px; border-radius: 8px;">';
            html += `<h4 style="margin: 0 0 10px 0;">${col.replace('_', ' ')}</h4>`;
            html += `<p style="margin: 5px 0;">Mean: ${stats.mean.toFixed(2)}</p>`;
            html += `<p style="margin: 5px 0;">Std: ${stats.std.toFixed(2)}</p>`;
            html += `<p style="margin: 5px 0;">Min: ${stats.min.toFixed(2)}</p>`;
            html += `<p style="margin: 5px 0;">Max: ${stats.max.toFixed(2)}</p>`;
            html += '</div>';
        });
    }
    html += '</div>';
    
    // Plots
    html += '<div class="plot-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">';
    for (let [key, imgData] of Object.entries(data.plots)) {
        const title = key.replace('_', ' ').replace(/([A-Z])/g, ' $1').trim();
        html += '<div style="text-align: center;">';
        html += `<h4>${title.toUpperCase()}</h4>`;
        html += `<img src="data:image/png;base64,${imgData}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`;
        html += '</div>';
    }
    html += '</div>';
    
    edaDiv.innerHTML = html;
}

function displayRegressionResults(data) {
    const resultsDiv = document.getElementById('regressionResults');
    
    let html = '<h3> Regression Analysis Results</h3>';
    
    // Metrics cards
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">';
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">R² Score</h4>';
    html += `<p style="font-size: 24px; margin: 0;">${data.r2_score.toFixed(4)}</p>`;
    html += '<p style="font-size: 12px; margin: 5px 0 0 0;">(Higher is better)</p>';
    html += '</div>';
    
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">RMSE</h4>';
    html += `<p style="font-size: 24px; margin: 0;">${data.rmse.toFixed(4)}</p>`;
    html += '<p style="font-size: 12px; margin: 5px 0 0 0;">(Lower is better)</p>';
    html += '</div>';
    
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">Model Type</h4>';
    html += `<p style="font-size: 18px; margin: 0;">${data.model_type === 'linear' ? 'Linear Regression' : 'Random Forest'}</p>`;
    html += '</div>';
    
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">Target</h4>';
    html += `<p style="font-size: 18px; margin: 0;">${data.target}</p>`;
    html += '</div>';
    html += '</div>';
    
    // Feature importance
    html += '<h4> Feature Importance:</h4>';
    html += '<div style="overflow-x: auto; margin-bottom: 20px;">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>Feature</th><th>Importance</th><th>Impact</th></tr></thead><tbody>';
    
    for (let [feature, importance] of Object.entries(data.feature_importance)) {
        const impactSymbol = importance > 0 ? '⬆ Positive' : '⬇ Negative';
        const color = importance > 0 ? 'green' : 'red';
        html += `<tr>`;
        html += `<td>${feature.replace('_', ' ')}</td>`;
        html += `<td>${importance.toFixed(4)}</td>`;
        html += `<td style="color: ${color};">${impactSymbol}</td>`;
        html += `</tr>`;
    }
    html += '</tbody></table>';
    html += '</div>';
    
    // Plot
    html += '<h4>Actual vs Predicted Values:</h4>';
    html += '<div style="text-align: center;">';
    html += `<img src="data:image/png;base64,${data.plot}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`;
    html += '</div>';
    
    resultsDiv.innerHTML = html;
}

function displaySensitivityResults(data) {
    const resultsDiv = document.getElementById('sensitivityResults');
    
    let html = '<h3> Sensitivity Analysis Results</h3>';
    
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">';
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">Analyzed Factor</h4>';
    html += `<p style="font-size: 18px; margin: 0;">${data.factor.replace('_', ' ')}</p>`;
    html += '</div>';
    
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">Baseline Value</h4>';
    html += `<p style="font-size: 18px; margin: 0;">${data.baseline_value.toFixed(2)}</p>`;
    html += '</div>';
    
    html += '<div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; text-align: center;">';
    html += '<h4 style="margin: 0 0 10px 0;">Baseline Prediction</h4>';
    html += `<p style="font-size: 18px; margin: 0;">${data.baseline_prediction.toFixed(2)}</p>`;
    html += '</div>';
    html += '</div>';
    
    // Results table
    html += '<h4> Sensitivity Analysis Results:</h4>';
    html += '<div style="overflow-x: auto; margin-bottom: 20px;">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>Change (%)</th><th>Factor Value</th><th>Predicted Performance</th><th>% Change in Performance</th></tr></thead><tbody>';
    
    data.results.forEach(result => {
        const perfChange = ((result.predicted_value - data.baseline_prediction) / data.baseline_prediction * 100).toFixed(2);
        const changeColor = perfChange > 0 ? 'green' : (perfChange < 0 ? 'red' : 'black');
        html += `<tr>`;
        html += `<td>${result.change_percent}%</td>`;
        html += `<td>${result.factor_value.toFixed(2)}</td>`;
        html += `<td>${result.predicted_value.toFixed(2)}</td>`;
        html += `<td style="color: ${changeColor}; font-weight: bold;">${perfChange}%</td>`;
        html += `</tr>`;
    });
    html += '</tbody></table>';
    html += '</div>';
    
    // Plot
    html += '<h4> Sensitivity Curve:</h4>';
    html += '<div style="text-align: center;">';
    html += `<img src="data:image/png;base64,${data.plot}" style="max-width: 100%; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`;
    html += '</div>';
    
    resultsDiv.innerHTML = html;
}

// FIXED: Display ranking results function
function displayRankingResults(data) {
    const rankingBody = document.getElementById('rankingBody');
    const rankingDiv = document.getElementById('rankingResults');
    
    if (!rankingBody) {
        console.error('Ranking body element not found');
        return;
    }
    
    if (!data.rankings || data.rankings.length === 0) {
        rankingBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No ranking data available</td></tr>';
        return;
    }
    
    // Generate table rows
    let html = '';
    data.rankings.forEach((location, index) => {
        const medal = index === 0 ? '' : (index === 1 ? '' : (index === 2 ? '' : ''));
        
        // Format values with 2 decimal places if they exist
        const perfValue = location.predicted_performance ? location.predicted_performance.toFixed(2) : 'N/A';
        const inventoryValue = location.Inventory_Level ? location.Inventory_Level.toFixed(2) : 
                              (location['Inventory Level'] ? location['Inventory Level'].toFixed(2) : 'N/A');
        const unitsSoldValue = location.Units_Sold ? location.Units_Sold.toFixed(2) : 
                              (location['Units Sold'] ? location['Units Sold'].toFixed(2) : 'N/A');
        const priceValue = location.Price ? location.Price.toFixed(2) : 'N/A';
        const discountValue = location.Discount ? location.Discount.toFixed(2) : 'N/A';
        const competitorPriceValue = location.Competitor_Pricing ? location.Competitor_Pricing.toFixed(2) : 
                                    (location['Competitor Pricing'] ? location['Competitor Pricing'].toFixed(2) : 'N/A');
        
        html += '<tr>';
        html += `<td style="font-weight: bold; text-align: center;">${medal} #${index + 1}</td>`;
        html += `<td><strong>${location.location}</strong></td>`;
        html += `<td>${perfValue}</td>`;
        html += `<td>${inventoryValue}</td>`;
        html += `<td>${unitsSoldValue}</td>`;
        html += `<td>${priceValue}</td>`;
        html += `<td>${discountValue}</td>`;
        html += `<td>${competitorPriceValue}</td>`;
        html += '</tr>';
    });
    
    rankingBody.innerHTML = html;
    
    // Add or update summary section
    let summaryDiv = rankingDiv.querySelector('.ranking-summary');
    if (!summaryDiv) {
        summaryDiv = document.createElement('div');
        summaryDiv.className = 'ranking-summary';
        rankingDiv.appendChild(summaryDiv);
    }
    
    // Calculate performance range
    const validPerformances = data.rankings
        .map(r => r.predicted_performance)
        .filter(p => p !== null && p !== undefined);
    
    const minPerf = validPerformances.length > 0 ? Math.min(...validPerformances).toFixed(2) : 'N/A';
    const maxPerf = validPerformances.length > 0 ? Math.max(...validPerformances).toFixed(2) : 'N/A';
    
    summaryDiv.innerHTML = `
        <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #667eea20, #764ba220); border-radius: 10px;">
            <h4>Location Ranking Summary</h4>
            <p><strong>Total Locations Analyzed:</strong> ${data.total_locations || data.rankings.length}</p>
            <p><strong>Top Recommended Location:</strong> ${data.rankings[0].location} (Score: ${data.rankings[0].predicted_performance ? data.rankings[0].predicted_performance.toFixed(2) : 'N/A'})</p>
            <p><strong>Performance Range:</strong> ${minPerf} - ${maxPerf}</p>
        </div>
    `;
}

// Add smooth scrolling and active section
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for navigation
    document.querySelectorAll('.nav-menu a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Set default values
    const locationInput = document.getElementById('locationColumn');
    if (locationInput && !locationInput.value) {
        locationInput.value = 'Store ID';
    }
    
    const targetInput = document.getElementById('targetColumn');
    if (targetInput && !targetInput.value) {
        targetInput.value = 'Units Sold';
    }
});