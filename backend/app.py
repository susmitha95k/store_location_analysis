from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
import os
import io
import base64
from werkzeug.utils import secure_filename
import traceback
import sys

app = Flask(__name__)
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "OPTIONS"])
from flask import render_template

@app.route('/')
def index():
    return render_template('login.html')
from flask import render_template

@app.route('/home')
def home():
    return render_template('home.html')
@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global variables to store data and models
current_data = None
current_model = None
feature_columns = None
target_column = 'sales'
scaler = StandardScaler()
uploaded_filename = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        # Simple authentication
        if username == "admin" and password == "password":
            return jsonify({"success": True, "message": "Login successful"})
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    global current_data, uploaded_filename
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            uploaded_filename = filename
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Load and preview data
            current_data = pd.read_csv(filepath)
            
            # Get basic info
            preview = current_data.head(10).replace({np.nan: None}).to_dict('records')
            columns = list(current_data.columns)
            shape = list(current_data.shape)
            missing_values = current_data.isnull().sum().to_dict()
            
            # Get data types
            dtypes = {col: str(dtype) for col, dtype in current_data.dtypes.items()}
            
            # Get numeric columns for regression
            numeric_cols = current_data.select_dtypes(include=[np.number]).columns.tolist()
            
            print(f"File uploaded: {filename}")
            print(f"Columns: {columns}")
            print(f"Numeric columns: {numeric_cols}")
            
            return jsonify({
                "success": True,
                "preview": preview,
                "columns": columns,
                "shape": shape,
                "missing_values": missing_values,
                "dtypes": dtypes,
                "numeric_columns": numeric_cols,
                "filename": filename
            })
        
        return jsonify({"error": "File type not allowed. Please upload CSV file."}), 400
    
    except Exception as e:
        print(f"Upload error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/clean-data', methods=['POST', 'OPTIONS'])
def clean_data():
    global current_data
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if current_data is None:
            return jsonify({"error": "No data uploaded. Please upload a file first."}), 400
        
        data = request.json
        method = data.get('method', 'drop')
        
        print(f"Cleaning data with method: {method}")
        print(f"Original shape: {current_data.shape}")
        
        # Make a copy for cleaning
        cleaned_data = current_data.copy()
        
        # Store original shape for reporting
        original_shape = cleaned_data.shape
        
        # Handle missing values
        if method == 'drop':
            cleaned_data = cleaned_data.dropna()
        else:  # fill
            for col in cleaned_data.columns:
                if cleaned_data[col].dtype in ['int64', 'float64']:
                    cleaned_data[col].fillna(cleaned_data[col].mean(), inplace=True)
                else:
                    cleaned_data[col].fillna(cleaned_data[col].mode()[0] if not cleaned_data[col].mode().empty else 'Unknown', inplace=True)
        
        # Remove duplicates
        cleaned_data = cleaned_data.drop_duplicates()
        
        print(f"After cleaning shape: {cleaned_data.shape}")
        
        # Normalize numerical columns
        numeric_cols = cleaned_data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            global scaler
            # Store original values for reference, but we'll keep normalized version
            cleaned_data[numeric_cols] = scaler.fit_transform(cleaned_data[numeric_cols])
            print(f"Normalized columns: {list(numeric_cols)}")
        
        current_data = cleaned_data
        
        # Calculate cleaning statistics
        rows_removed = original_shape[0] - cleaned_data.shape[0]
        
        # Get preview
        preview = cleaned_data.head(10).replace({np.nan: None}).to_dict('records')
        
        return jsonify({
            "success": True,
            "message": f"Data cleaned successfully. Removed {rows_removed} rows.",
            "shape": list(cleaned_data.shape),
            "preview": preview
        })
    
    except Exception as e:
        print(f"Clean data error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/eda', methods=['GET', 'OPTIONS'])
def perform_eda():
    global current_data
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if current_data is None:
            return jsonify({"error": "No data available. Please upload and clean data first."}), 400
        
        print("Performing EDA...")
        
        # Generate EDA plots
        plots = {}
        
        # Get numeric data
        numeric_data = current_data.select_dtypes(include=[np.number])
        
        if numeric_data.empty:
            return jsonify({"error": "No numeric columns found for EDA"}), 400
        
        print(f"Numeric columns for EDA: {list(numeric_data.columns)}")
        
        # 1. Correlation Heatmap
        plt.figure(figsize=(10, 8))
        correlation = numeric_data.corr()
        sns.heatmap(correlation, annot=True, cmap='coolwarm', center=0, fmt='.2f', 
                   square=True, linewidths=0.5)
        plt.title('Correlation Heatmap', fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plots['heatmap'] = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        # 2. Distribution plots
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        axes = axes.flatten()
        
        for i, col in enumerate(numeric_data.columns[:6]):
            sns.histplot(current_data[col].dropna(), kde=True, ax=axes[i])
            axes[i].set_title(f'Distribution of {col}')
            axes[i].set_xlabel(col)
        
        # Hide empty subplots
        for j in range(min(6, len(numeric_data.columns)), 6):
            axes[j].set_visible(False)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plots['distributions'] = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        # 3. Box plots
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        axes = axes.flatten()
        
        for i, col in enumerate(numeric_data.columns[:6]):
            sns.boxplot(y=current_data[col], ax=axes[i])
            axes[i].set_title(f'Box Plot - {col}')
        
        # Hide empty subplots
        for j in range(min(6, len(numeric_data.columns)), 6):
            axes[j].set_visible(False)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plots['boxplots'] = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        # Summary statistics
        summary_stats = numeric_data.describe().to_dict()
        
        return jsonify({
            "success": True,
            "plots": plots,
            "summary_stats": summary_stats,
            "numeric_columns": list(numeric_data.columns)
        })
    
    except Exception as e:
        print(f"EDA error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/regression', methods=['POST', 'OPTIONS'])
def run_regression():
    global current_data, current_model, feature_columns
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if current_data is None:
            return jsonify({"error": "No data available. Please upload and clean data first."}), 400
        
        data = request.json
        target = data.get('target', 'sales')
        model_type = data.get('model_type', 'linear')
        
        print(f"Running regression with target: {target}, model: {model_type}")
        print(f"Data shape: {current_data.shape}")
        
        # Prepare data
        numeric_data = current_data.select_dtypes(include=[np.number])
        print(f"Numeric columns available: {list(numeric_data.columns)}")
        
        if target not in numeric_data.columns:
            return jsonify({
                "error": f"Target column '{target}' not found. Available numeric columns: {list(numeric_data.columns)}"
            }), 400
        
        # Separate features and target
        X = numeric_data.drop(columns=[target])
        y = numeric_data[target]
        
        print(f"Features: {list(X.columns)}")
        print(f"Target shape: {y.shape}, Features shape: {X.shape}")
        
        if X.shape[1] == 0:
            return jsonify({"error": "No feature columns available for regression"}), 400
        
        if len(X) < 10:
            return jsonify({"error": f"Not enough data points. Need at least 10, have {len(X)}"}), 400
        
        feature_columns = list(X.columns)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        print(f"Train set size: {len(X_train)}, Test set size: {len(X_test)}")
        
        # Train model
        if model_type == 'linear':
            model = LinearRegression()
        else:
            model = RandomForestRegressor(n_estimators=50, random_state=42)
        
        model.fit(X_train, y_train)
        current_model = model
        
        # Predictions
        y_pred = model.predict(X_test)
        
        # Metrics
        r2 = r2_score(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        
        print(f"R² score: {r2}, RMSE: {rmse}")
        
        # Feature importance
        if model_type == 'linear':
            importance = dict(zip(feature_columns, model.coef_))
            # Sort by absolute value
            importance = dict(sorted(importance.items(), key=lambda x: abs(x[1]), reverse=True))
        else:
            importance = dict(zip(feature_columns, model.feature_importances_))
            importance = dict(sorted(importance.items(), key=lambda x: x[1], reverse=True))
        
        print(f"Feature importance: {importance}")
        
        # Plot actual vs predicted
        plt.figure(figsize=(10, 6))
        plt.scatter(y_test, y_pred, alpha=0.6)
        plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        plt.xlabel('Actual Values')
        plt.ylabel('Predicted Values')
        plt.title(f'Actual vs Predicted (R² = {r2:.4f})')
        plt.grid(True, alpha=0.3)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plot = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        return jsonify({
            "success": True,
            "r2_score": float(r2),
            "rmse": float(rmse),
            "feature_importance": {k: float(v) for k, v in importance.items()},
            "plot": plot,
            "model_type": model_type,
            "target": target,
            "features": feature_columns
        })
    
    except Exception as e:
        print(f"Regression error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/sensitivity-analysis', methods=['POST', 'OPTIONS'])
def sensitivity_analysis():
    global current_model, feature_columns, current_data
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if current_model is None:
            return jsonify({"error": "No trained model available. Please run regression first."}), 400
        
        data = request.json
        factor = data.get('factor')
        
        if not factor:
            return jsonify({"error": "Please specify a factor to analyze"}), 400
        
        if factor not in feature_columns:
            return jsonify({
                "error": f"Factor '{factor}' not found. Available features: {feature_columns}"
            }), 400
        
        print(f"Running sensitivity analysis for factor: {factor}")
        
        # Define range of changes
        factor_range = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]
        
        # Get average values for all features
        avg_values = {}
        for col in feature_columns:
            if col in current_data.columns:
                avg_values[col] = float(current_data[col].mean())
            else:
                avg_values[col] = 0.0
        
        print(f"Average values: {avg_values}")
        
        # Perform sensitivity analysis
        results = []
        for pct_change in factor_range:
            test_values = avg_values.copy()
            change_factor = 1 + pct_change/100
            test_values[factor] = avg_values[factor] * change_factor
            
            # Create DataFrame for prediction
            X_test = pd.DataFrame([test_values])[feature_columns]
            prediction = float(current_model.predict(X_test)[0])
            
            results.append({
                "change_percent": pct_change,
                "predicted_value": prediction,
                "factor_value": float(test_values[factor])
            })
        
        # Generate plot
        plt.figure(figsize=(10, 6))
        
        changes = [r['change_percent'] for r in results]
        predictions = [r['predicted_value'] for r in results]
        
        plt.plot(changes, predictions, 'bo-', linewidth=2, markersize=8)
        plt.axhline(y=predictions[5], color='r', linestyle='--', alpha=0.5, label='Baseline')
        plt.axvline(x=0, color='gray', linestyle='-', alpha=0.3)
        
        plt.xlabel(f'Percentage Change in {factor}')
        plt.ylabel('Predicted Store Performance')
        plt.title(f'Sensitivity Analysis - Impact of {factor}')
        plt.grid(True, alpha=0.3)
        plt.legend()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plot = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close()
        
        return jsonify({
            "success": True,
            "results": results,
            "plot": plot,
            "factor": factor,
            "baseline_value": float(avg_values[factor]),
            "baseline_prediction": float(predictions[5])
        })
    
    except Exception as e:
        print(f"Sensitivity analysis error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/location-ranking', methods=['POST', 'OPTIONS'])
def rank_locations():
    global current_data, current_model, feature_columns
    
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if current_data is None:
            return jsonify({"error": "No data available. Please upload data first."}), 400
        
        if current_model is None:
            return jsonify({"error": "No trained model available. Please run regression first."}), 400
        
        data = request.json
        location_column = data.get('location_column', 'location')
        
        print(f"Ranking locations using column: {location_column}")
        
        # Check if location column exists
        if location_column not in current_data.columns:
            # Try to find a column that might contain location information
            possible_cols = [col for col in current_data.columns if any(x in col.lower() for x in ['location', 'store', 'city', 'name'])]
            
            if possible_cols:
                location_column = possible_cols[0]
                print(f"Using alternative location column: {location_column}")
            else:
                # Create synthetic location IDs
                current_data['location_id'] = [f'Location_{i+1}' for i in range(len(current_data))]
                location_column = 'location_id'
                print(f"Created synthetic location IDs")
        
        # Get unique locations
        locations = current_data[location_column].unique()
        print(f"Found {len(locations)} unique locations")
        
        # Predict performance for each location
        rankings = []
        for location in locations:
            location_data = current_data[current_data[location_column] == location].iloc[0]
            
            # Prepare features
            X_test = pd.DataFrame([location_data])[feature_columns]
            prediction = float(current_model.predict(X_test)[0])
            
            # Get available metrics
            ranking_item = {
                "location": str(location),
                "predicted_performance": prediction,
            }
            
            # Add available features with default values
            for col in ['population_density', 'competitor_count', 'accessibility_score', 'rental_cost', 'footfall']:
                if col in location_data.index:
                    ranking_item[col] = float(location_data[col])
                else:
                    ranking_item[col] = 0.0
            
            rankings.append(ranking_item)
        
        # Sort by predicted performance
        rankings = sorted(rankings, key=lambda x: x['predicted_performance'], reverse=True)
        
        return jsonify({
            "success": True,
            "rankings": rankings,
            "total_locations": len(rankings)
        })
    
    except Exception as e:
        print(f"Location ranking error: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET', 'OPTIONS'])
def get_status():
    if request.method == 'OPTIONS':
        return '', 200
    
    status = {
        "data_loaded": current_data is not None,
        "model_trained": current_model is not None,
        "feature_count": len(feature_columns) if feature_columns else 0,
        "filename": uploaded_filename,
        "data_shape": list(current_data.shape) if current_data is not None else None,
        "columns": list(current_data.columns) if current_data is not None else None
    }
    
    print(f"Status: {status}")
    
    return jsonify(status)

@app.route('/api/reset', methods=['POST', 'OPTIONS'])
def reset_session():
    global current_data, current_model, feature_columns, uploaded_filename
    
    if request.method == 'OPTIONS':
        return '', 200
    
    current_data = None
    current_model = None
    feature_columns = None
    uploaded_filename = None
    
    print("Session reset")
    
    return jsonify({"success": True, "message": "Session reset successfully"})

@app.route('/api/debug-data', methods=['GET', 'OPTIONS'])
def debug_data():
    if request.method == 'OPTIONS':
        return '', 200
    
    if current_data is None:
        return jsonify({"error": "No data"}), 400
    
    info = {
        "shape": list(current_data.shape),
        "columns": list(current_data.columns),
        "dtypes": {col: str(dtype) for col, dtype in current_data.dtypes.items()},
        "numeric_columns": list(current_data.select_dtypes(include=[np.number]).columns),
        "first_row": current_data.iloc[0].replace({np.nan: None}).to_dict() if len(current_data) > 0 else None
    }
    
    return jsonify(info)

if __name__ == '__main__':
    print("=" * 60)
    print("STORE LOCATION ANALYSIS API SERVER")
    print("=" * 60)
    print(f"Server running on: http://localhost:5000")
    print(f"Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print("\nAvailable endpoints:")
    print("  POST /api/login - User authentication")
    print("  POST /api/upload - Upload CSV file")
    print("  POST /api/clean-data - Clean and preprocess data")
    print("  GET  /api/eda - Perform exploratory data analysis")
    print("  POST /api/regression - Run regression analysis")
    print("  POST /api/sensitivity-analysis - Perform sensitivity analysis")
    print("  POST /api/location-ranking - Rank locations")
    print("  GET  /api/status - Get current session status")
    print("  POST /api/reset - Reset session")
    print("  GET  /api/debug-data - Debug current data")
    print("=" * 60)
    
    app.run(debug=True, port=5000, host='0.0.0.0')