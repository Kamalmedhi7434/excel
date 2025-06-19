from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import plotly.utils
import json
import io
import tempfile
import os

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Dashboard API is running'})

@dashboard_bp.route('/upload', methods=['POST'])
@cross_origin()
def upload_file():
    """Handle file upload and process Excel/CSV data"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided', 'success': False}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected', 'success': False}), 400
        
        # Check file extension
        filename = file.filename.lower()
        if not (filename.endswith('.xlsx') or filename.endswith('.xls') or filename.endswith('.csv')):
            return jsonify({'error': 'Invalid file format. Please upload Excel (.xlsx, .xls) or CSV files.', 'success': False}), 400
        
        # Read file content
        file_content = file.read()
        
        # Process the file based on extension
        try:
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            elif filename.endswith('.xlsx'):
                df = pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
            elif filename.endswith('.xls'):
                df = pd.read_excel(io.BytesIO(file_content), engine='xlrd')
        except Exception as e:
            return jsonify({'error': f'Error reading file: {str(e)}', 'success': False}), 400
        
        # Perform analysis
        analysis_result = analyze_dataframe(df)
        analysis_result['filename'] = file.filename
        analysis_result['success'] = True
        
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}', 'success': False}), 500

@dashboard_bp.route('/sample-data', methods=['GET'])
@cross_origin()
def get_sample_data():
    """Return sample data for testing"""
    try:
        # Create sample dataset
        sample_data = {
            'Product': ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones', 'Tablet', 'Speaker', 'Webcam'],
            'Category': ['Electronics', 'Accessories', 'Accessories', 'Electronics', 'Accessories', 'Electronics', 'Accessories', 'Accessories'],
            'Sales': [100, 200, 150, 300, 80, 120, 90, 60],
            'Price': [500, 25, 75, 400, 150, 300, 80, 45],
            'Region': ['North', 'South', 'East', 'West', 'North', 'South', 'East', 'West'],
            'Rating': [4.5, 4.2, 4.0, 4.8, 4.3, 4.6, 4.1, 3.9]
        }
        
        df = pd.DataFrame(sample_data)
        analysis_result = analyze_dataframe(df)
        analysis_result['filename'] = 'Sample Data'
        analysis_result['success'] = True
        
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({'error': f'Error generating sample data: {str(e)}', 'success': False}), 500

def analyze_dataframe(df):
    """Perform comprehensive analysis on the DataFrame"""
    try:
        analysis = {}
        
        # Basic information
        analysis['basic_info'] = {
            'rows': len(df),
            'columns': len(df.columns),
            'column_names': df.columns.tolist()
        }
        
        # Data types
        analysis['data_types'] = df.dtypes.astype(str).to_dict()
        
        # Missing values
        analysis['missing_values'] = df.isnull().sum().to_dict()
        
        # Numeric columns statistics
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if numeric_cols:
            analysis['numeric_stats'] = df[numeric_cols].describe().to_dict()
        else:
            analysis['numeric_stats'] = {}
        
        # Generate charts
        charts = generate_charts(df)
        analysis['charts'] = charts
        
        # Sample data (first 10 rows)
        analysis['sample_data'] = df.head(10).to_dict('records')
        
        return analysis
        
    except Exception as e:
        return {'error': f'Analysis failed: {str(e)}'}

def generate_charts(df):
    """Generate various charts from the DataFrame"""
    charts = {}
    
    try:
        # Get numeric and categorical columns
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # 1. Pie chart for categorical data
        if categorical_cols:
            cat_col = categorical_cols[0]
            value_counts = df[cat_col].value_counts().head(10)
            
            fig_pie = go.Figure(data=[go.Pie(
                labels=value_counts.index.tolist(),
                values=value_counts.values.tolist(),
                hole=0.3,
                marker=dict(colors=px.colors.qualitative.Set3)
            )])
            fig_pie.update_layout(
                title=f'Distribution of {cat_col}',
                height=400,
                showlegend=True,
                font=dict(size=12)
            )
            charts['pie_chart'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_pie))
        
        # 2. Bar chart for categorical data
        if categorical_cols:
            cat_col = categorical_cols[0]
            value_counts = df[cat_col].value_counts().head(10)
            
            fig_bar = go.Figure(data=[go.Bar(
                x=value_counts.index.tolist(),
                y=value_counts.values.tolist(),
                marker_color=px.colors.qualitative.Pastel[0],
                text=value_counts.values.tolist(),
                textposition='auto'
            )])
            fig_bar.update_layout(
                title=f'Count of {cat_col}',
                xaxis_title=cat_col,
                yaxis_title='Count',
                height=400,
                font=dict(size=12)
            )
            charts['bar_chart'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_bar))
        
        # 3. Histogram for numeric data
        if numeric_cols:
            num_col = numeric_cols[0]
            fig_hist = go.Figure(data=[go.Histogram(
                x=df[num_col].dropna(),
                nbinsx=30,
                marker_color=px.colors.qualitative.Pastel[1],
                opacity=0.8
            )])
            fig_hist.update_layout(
                title=f'Distribution of {num_col}',
                xaxis_title=num_col,
                yaxis_title='Frequency',
                height=400,
                font=dict(size=12)
            )
            charts['histogram'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_hist))
        
        # 4. Line chart for numeric data
        if len(numeric_cols) >= 2:
            x_col = numeric_cols[0]
            y_col = numeric_cols[1]
            
            df_sorted = df.sort_values(x_col)
            
            fig_line = go.Figure(data=[go.Scatter(
                x=df_sorted[x_col],
                y=df_sorted[y_col],
                mode='lines+markers',
                marker=dict(color=px.colors.qualitative.Pastel[2], size=8),
                line=dict(width=3)
            )])
            fig_line.update_layout(
                title=f'{y_col} vs {x_col}',
                xaxis_title=x_col,
                yaxis_title=y_col,
                height=400,
                font=dict(size=12)
            )
            charts['line_chart'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_line))
        
        # 5. Correlation heatmap
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            
            fig_heatmap = go.Figure(data=go.Heatmap(
                z=corr_matrix.values,
                x=corr_matrix.columns.tolist(),
                y=corr_matrix.columns.tolist(),
                colorscale='RdBu',
                zmid=0,
                text=corr_matrix.round(2).values,
                texttemplate='%{text}',
                textfont={"size": 10}
            ))
            fig_heatmap.update_layout(
                title='Correlation Heatmap',
                height=400,
                font=dict(size=12)
            )
            charts['heatmap'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_heatmap))
        
        # 6. Box plot for numeric data
        if numeric_cols:
            num_col = numeric_cols[0]
            fig_box = go.Figure(data=[go.Box(
                y=df[num_col].dropna(),
                name=num_col,
                marker_color=px.colors.qualitative.Pastel[3],
                boxpoints='outliers'
            )])
            fig_box.update_layout(
                title=f'Box Plot of {num_col}',
                yaxis_title=num_col,
                height=400,
                font=dict(size=12)
            )
            charts['box_plot'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_box))
        
        # 7. Scatter plot if we have multiple numeric columns
        if len(numeric_cols) >= 2:
            x_col = numeric_cols[0]
            y_col = numeric_cols[1]
            
            fig_scatter = go.Figure(data=[go.Scatter(
                x=df[x_col],
                y=df[y_col],
                mode='markers',
                marker=dict(
                    color=px.colors.qualitative.Pastel[4],
                    size=10,
                    opacity=0.7
                ),
                text=df.index,
                hovertemplate=f'<b>{x_col}</b>: %{{x}}<br><b>{y_col}</b>: %{{y}}<extra></extra>'
            )])
            fig_scatter.update_layout(
                title=f'Scatter Plot: {y_col} vs {x_col}',
                xaxis_title=x_col,
                yaxis_title=y_col,
                height=400,
                font=dict(size=12)
            )
            charts['scatter_plot'] = json.loads(plotly.utils.PlotlyJSONEncoder().encode(fig_scatter))
        
        return charts
        
    except Exception as e:
        return {'error': f'Chart generation failed: {str(e)}'}

