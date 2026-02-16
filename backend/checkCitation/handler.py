import json
import re
import os

def lambda_handler(event, context):
    """Check citation format"""
    try:
        citation = event.get('citation', '')
        format_type = event.get('format', 'apa').lower()

        result = validate_citation(citation, format_type)

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def validate_citation(citation, format_type):
    """Validate citation based on format"""
    if format_type == 'apa':
        return validate_apa(citation)
    elif format_type == 'mla':
        return validate_mla(citation)
    else:
        return {'formatCorrect': False, 'issues': ['Unsupported format']}

def validate_apa(citation):
    """Validate APA format: Author, A. (Year). Title."""
    pattern = r'^[^(]+\(\d{4}\)\..+'
    match = re.match(pattern, citation)

    return {
        'formatCorrect': bool(match),
        'hasRequiredFields': bool(match),
        'issues': [] if match else ['Does not match APA format']
    }

def validate_mla(citation):
    """Validate MLA format"""
    pattern = r'^[^.]+\..+'
    match = re.match(pattern, citation)

    return {
        'formatCorrect': bool(match),
        'hasRequiredFields': bool(match),
        'issues': [] if match else ['Does not match MLA format']
    }
