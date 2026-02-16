#!/usr/bin/env python3
"""
Generate Architecture Diagram for Source Validator Application
"""
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Set up the figure
fig, ax = plt.subplots(1, 1, figsize=(16, 12))
ax.set_xlim(0, 16)
ax.set_ylim(0, 12)
ax.axis('off')

# Define colors
COLOR_USER = '#E8F5E9'
COLOR_CDN = '#E3F2FD'
COLOR_COMPUTE = '#FFF3E0'
COLOR_STORAGE = '#F3E5F5'
COLOR_DATABASE = '#FCE4EC'
COLOR_EXTERNAL = '#EEEEEE'

def draw_box(ax, x, y, width, height, text, color, fontsize=10, style='round'):
    """Draw a rounded box with text"""
    box = FancyBboxPatch(
        (x, y), width, height,
        boxstyle=f"{style},pad=0.1",
        facecolor=color,
        edgecolor='#333',
        linewidth=2
    )
    ax.add_patch(box)

    # Add text
    ax.text(x + width/2, y + height/2, text,
            ha='center', va='center',
            fontsize=fontsize, fontweight='bold',
            wrap=True)

def draw_arrow(ax, x1, y1, x2, y2, label='', color='#333'):
    """Draw an arrow between two points"""
    arrow = FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle='->,head_width=0.4,head_length=0.8',
        color=color,
        linewidth=2,
        linestyle='-'
    )
    ax.add_patch(arrow)

    # Add label if provided
    if label:
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mid_x + 0.2, mid_y + 0.1, label,
                fontsize=8, color=color, style='italic',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))

# Title
ax.text(8, 11.5, 'Source Validator - AWS Serverless Architecture',
        ha='center', va='center', fontsize=18, fontweight='bold')

# ===== Layer 1: User & DNS =====
draw_box(ax, 0.5, 10, 2, 0.8, 'User/Browser', COLOR_USER, 10)
draw_box(ax, 3, 10, 2, 0.8, 'Route 53\n(Optional DNS)', COLOR_CDN, 9)

# ===== Layer 2: CloudFront =====
draw_box(ax, 1, 8.5, 3.5, 0.8, 'Amazon CloudFront\n(CDN + HTTPS)', COLOR_CDN, 10)

# ===== Layer 3: Frontend & API Gateway =====
draw_box(ax, 0.5, 6.8, 2.5, 1, 'S3 Bucket\nFrontend\n(React App)', COLOR_STORAGE, 9)
draw_box(ax, 3.5, 6.8, 3, 1, 'API Gateway\n(REST API)', COLOR_CDN, 10)

# ===== Layer 4: Lambda Functions =====
draw_box(ax, 0.5, 4.5, 1.8, 1.2, 'Lambda\nParse\nFunction', COLOR_COMPUTE, 9)
draw_box(ax, 2.8, 4.5, 1.8, 1.2, 'Lambda\nValidate\nFunction', COLOR_COMPUTE, 9)
draw_box(ax, 5.1, 4.5, 1.8, 1.2, 'Lambda\nCheck Citation\n(Python)', COLOR_COMPUTE, 9)
draw_box(ax, 7.4, 4.5, 1.8, 1.2, 'Lambda\nGenerate Report\nFunction', COLOR_COMPUTE, 9)

# ===== Layer 5: Data Layer =====
draw_box(ax, 1, 2.3, 3, 1.2, 'DynamoDB\nValidationSessions\nTable', COLOR_DATABASE, 10)
draw_box(ax, 5, 2.3, 3, 1.2, 'S3 Bucket\nFile Storage\n(Temp Files)', COLOR_STORAGE, 10)

# ===== Layer 6: Monitoring & External =====
draw_box(ax, 0.5, 0.3, 2.5, 0.8, 'CloudWatch\n(Logs + Metrics)', COLOR_EXTERNAL, 9)
draw_box(ax, 3.5, 0.3, 2, 0.8, 'X-Ray\n(Tracing)', COLOR_EXTERNAL, 9)
draw_box(ax, 6, 0.3, 2.5, 0.8, 'External APIs\n(CrossRef, DOI)', COLOR_EXTERNAL, 9)

# ===== Right side: Shared Layer =====
draw_box(ax, 10, 4.5, 2, 1.2, 'Lambda Layer\nShared Code\n& Dependencies', COLOR_COMPUTE, 9)

# ===== Right side: IAM =====
draw_box(ax, 12.5, 4.5, 2, 1.2, 'IAM Roles\n& Policies', COLOR_EXTERNAL, 9)

# ===== Right side: CDK =====
draw_box(ax, 10, 2.3, 4.5, 1.2, 'AWS CDK (TypeScript)\nInfrastructure as Code', COLOR_CDN, 10)

# ===== Draw Arrows =====

# User to CloudFront
draw_arrow(ax, 1.5, 10, 2.75, 9.3, 'HTTPS')

# CloudFront to S3 Frontend
draw_arrow(ax, 1.75, 8.5, 1.75, 7.8, 'Static\nFiles')

# CloudFront to API Gateway
draw_arrow(ax, 3.5, 8.5, 5, 7.8, 'API\nCalls')

# API Gateway to Lambda Functions
draw_arrow(ax, 4.5, 6.8, 1.4, 5.7, 'POST\n/parse')
draw_arrow(ax, 5, 6.8, 3.7, 5.7, 'POST\n/validate')
draw_arrow(ax, 5.5, 6.8, 6, 5.7, '')
draw_arrow(ax, 6, 6.8, 8.3, 5.7, 'GET\n/report/{id}')

# Validate to Check Citation
draw_arrow(ax, 4.6, 4.9, 5.1, 5.3, 'invoke')

# Lambda to DynamoDB
draw_arrow(ax, 1.4, 4.5, 2, 3.5, 'write')
draw_arrow(ax, 3.7, 4.5, 2.8, 3.5, 'read/write')
draw_arrow(ax, 8.3, 4.5, 3.5, 3.5, 'read')

# Lambda to S3
draw_arrow(ax, 1.4, 4.5, 6, 3.5, 'optional\nupload')
draw_arrow(ax, 8.3, 4.5, 7, 3.5, 'write\nreport')

# Validate to External APIs
draw_arrow(ax, 3.7, 4.5, 7, 1.1, 'HTTP\nrequests')

# Lambda Layer connections
draw_arrow(ax, 10, 5.1, 2.3, 5.1, '', '#888')
draw_arrow(ax, 10, 5.3, 4.6, 5.3, '', '#888')
draw_arrow(ax, 10, 5.5, 6.9, 5.5, '', '#888')
draw_arrow(ax, 10, 5.7, 9.2, 5.7, '', '#888')

# Monitoring connections
draw_arrow(ax, 1.4, 4.5, 1.75, 1.1, 'logs', '#666')
draw_arrow(ax, 3.7, 4.5, 4.5, 1.1, 'traces', '#666')

# ===== Add Annotations =====
ax.text(8, 9.5, 'Client Layer', fontsize=11, style='italic', color='#666')
ax.text(8, 7.3, 'API & Hosting', fontsize=11, style='italic', color='#666')
ax.text(11, 5.1, 'Compute Layer', fontsize=11, style='italic', color='#666')
ax.text(11, 2.9, 'Data Layer', fontsize=11, style='italic', color='#666')
ax.text(11, 0.7, 'Monitoring & External', fontsize=11, style='italic', color='#666')

# ===== Legend =====
legend_x = 10
legend_y = 8
legend_spacing = 0.6

ax.text(legend_x, legend_y + 0.5, 'Legend:', fontsize=10, fontweight='bold')

legend_items = [
    ('User Interface', COLOR_USER),
    ('CDN / API Gateway', COLOR_CDN),
    ('Compute (Lambda)', COLOR_COMPUTE),
    ('Storage (S3)', COLOR_STORAGE),
    ('Database', COLOR_DATABASE),
    ('External / Monitoring', COLOR_EXTERNAL),
]

for i, (label, color) in enumerate(legend_items):
    y = legend_y - (i * legend_spacing)
    rect = patches.Rectangle((legend_x, y - 0.2), 0.4, 0.4,
                             facecolor=color, edgecolor='#333', linewidth=1)
    ax.add_patch(rect)
    ax.text(legend_x + 0.6, y, label, fontsize=9, va='center')

# ===== Key Features Box =====
features_text = """Key Features:
• Serverless Architecture
• Auto-scaling
• Pay-per-use pricing
• Global CDN delivery
• Infrastructure as Code (CDK)
"""

ax.text(10, 6.5, features_text, fontsize=9,
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#FFF9C4',
                 edgecolor='#333', linewidth=1.5),
        verticalalignment='top', family='monospace')

# ===== Footer =====
ax.text(8, 0.1, '© 2024 Source Validator | AWS Serverless Architecture',
        ha='center', fontsize=8, style='italic', color='#666')

plt.tight_layout()
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, 'architecture-diagram.png')
plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
print("Architecture diagram saved to: specs/architecture-diagram.png")
