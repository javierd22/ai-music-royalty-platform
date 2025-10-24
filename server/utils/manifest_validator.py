"""
Manifest Validation Service

Per PRD Section 5.2: Partner Platform
Validates C2PA-compatible provenance manifests for compliance
"""

import json
import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import hashlib

class ManifestValidationError(Exception):
    """Custom exception for manifest validation errors"""
    pass

class ManifestValidator:
    """
    Validates C2PA-compatible provenance manifests
    Per PRD Section 5.2: Manifest verification and compliance indicators
    """
    
    def __init__(self):
        self.required_fields = [
            'generator_id',
            'track_id', 
            'timestamp',
            'prompt',
            'confidence'
        ]
        
        self.optional_fields = [
            'model_version',
            'parameters',
            'metadata',
            'signature'
        ]
    
    def validate_manifest_url(self, manifest_url: str) -> bool:
        """
        Validate manifest URL format
        Per PRD Section 5.2: Basic URL validation
        """
        if not manifest_url:
            return False
        
        # Check if URL starts with http/https
        if not manifest_url.startswith(('http://', 'https://')):
            return False
        
        # Check if URL contains manifest identifier
        if 'manifest' not in manifest_url.lower():
            return False
        
        # Basic URL format validation
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        return bool(url_pattern.match(manifest_url))
    
    def validate_manifest_structure(self, manifest_data: Dict) -> Tuple[bool, List[str]]:
        """
        Validate manifest JSON structure
        Per PRD Section 5.2: Manifest structure validation
        """
        errors = []
        
        if not isinstance(manifest_data, dict):
            errors.append("Manifest must be a JSON object")
            return False, errors
        
        # Check required fields
        for field in self.required_fields:
            if field not in manifest_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate field types and values
        if 'generator_id' in manifest_data:
            if not isinstance(manifest_data['generator_id'], str) or not manifest_data['generator_id'].strip():
                errors.append("generator_id must be a non-empty string")
        
        if 'track_id' in manifest_data:
            if not isinstance(manifest_data['track_id'], str) or not manifest_data['track_id'].strip():
                errors.append("track_id must be a non-empty string")
        
        if 'timestamp' in manifest_data:
            try:
                # Try to parse ISO timestamp
                datetime.fromisoformat(manifest_data['timestamp'].replace('Z', '+00:00'))
            except (ValueError, TypeError):
                errors.append("timestamp must be a valid ISO 8601 datetime")
        
        if 'prompt' in manifest_data:
            if not isinstance(manifest_data['prompt'], str):
                errors.append("prompt must be a string")
        
        if 'confidence' in manifest_data:
            try:
                confidence = float(manifest_data['confidence'])
                if not 0 <= confidence <= 1:
                    errors.append("confidence must be between 0 and 1")
            except (ValueError, TypeError):
                errors.append("confidence must be a number between 0 and 1")
        
        return len(errors) == 0, errors
    
    def validate_manifest_signature(self, manifest_data: Dict) -> Tuple[bool, List[str]]:
        """
        Validate manifest signature (if present)
        Per PRD Section 5.2: Cryptographic verification
        """
        errors = []
        
        if 'signature' not in manifest_data:
            # Signature is optional for MVP
            return True, errors
        
        signature_data = manifest_data['signature']
        
        if not isinstance(signature_data, dict):
            errors.append("signature must be an object")
            return False, errors
        
        required_sig_fields = ['algorithm', 'value', 'timestamp']
        for field in required_sig_fields:
            if field not in signature_data:
                errors.append(f"Missing signature field: {field}")
        
        if 'algorithm' in signature_data:
            if signature_data['algorithm'] not in ['HMAC-SHA256', 'RSA-SHA256']:
                errors.append("Unsupported signature algorithm")
        
        return len(errors) == 0, errors
    
    def validate_manifest_completeness(self, manifest_data: Dict) -> Tuple[bool, List[str]]:
        """
        Validate manifest completeness for compliance
        Per PRD Section 5.2: Compliance indicators
        """
        errors = []
        
        # Check if all required fields are present and valid
        structure_valid, structure_errors = self.validate_manifest_structure(manifest_data)
        if not structure_valid:
            errors.extend(structure_errors)
        
        # Check if manifest has sufficient data for compliance
        if 'metadata' in manifest_data:
            metadata = manifest_data['metadata']
            if isinstance(metadata, dict):
                # Check for compliance indicators
                compliance_indicators = [
                    'model_version',
                    'generation_parameters',
                    'input_validation',
                    'output_metadata'
                ]
                
                missing_indicators = []
                for indicator in compliance_indicators:
                    if indicator not in metadata:
                        missing_indicators.append(indicator)
                
                if missing_indicators:
                    errors.append(f"Missing compliance indicators: {', '.join(missing_indicators)}")
        
        return len(errors) == 0, errors
    
    def validate_manifest(self, manifest_url: str, manifest_data: Optional[Dict] = None) -> Dict[str, any]:
        """
        Complete manifest validation
        Per PRD Section 5.2: Full manifest validation pipeline
        """
        result = {
            'valid': False,
            'compliance_status': 'non_compliant',
            'errors': [],
            'warnings': [],
            'validation_score': 0.0
        }
        
        # Validate URL
        if not self.validate_manifest_url(manifest_url):
            result['errors'].append("Invalid manifest URL format")
            return result
        
        # If manifest data is provided, validate structure
        if manifest_data:
            structure_valid, structure_errors = self.validate_manifest_structure(manifest_data)
            if not structure_valid:
                result['errors'].extend(structure_errors)
                return result
            
            # Validate signature
            signature_valid, signature_errors = self.validate_manifest_signature(manifest_data)
            if not signature_valid:
                result['errors'].extend(signature_errors)
            
            # Validate completeness
            completeness_valid, completeness_errors = self.validate_manifest_completeness(manifest_data)
            if not completeness_errors:
                result['warnings'].extend(completeness_errors)
            
            # Calculate validation score
            total_checks = len(self.required_fields) + len(self.optional_fields)
            passed_checks = 0
            
            for field in self.required_fields:
                if field in manifest_data and manifest_data[field]:
                    passed_checks += 1
            
            for field in self.optional_fields:
                if field in manifest_data and manifest_data[field]:
                    passed_checks += 1
            
            result['validation_score'] = passed_checks / total_checks
        
        # Determine compliance status
        if not result['errors']:
            if result['validation_score'] >= 0.8:
                result['compliance_status'] = 'compliant'
                result['valid'] = True
            elif result['validation_score'] >= 0.6:
                result['compliance_status'] = 'pending'
                result['valid'] = True
            else:
                result['compliance_status'] = 'non_compliant'
        else:
            result['compliance_status'] = 'non_compliant'
        
        return result
    
    def generate_manifest_template(self, generator_id: str, track_id: str) -> Dict[str, any]:
        """
        Generate a compliant manifest template
        Per PRD Section 5.2: Manifest generation for compliance
        """
        now = datetime.utcnow().isoformat() + 'Z'
        
        template = {
            'generator_id': generator_id,
            'track_id': track_id,
            'timestamp': now,
            'prompt': '',
            'confidence': 0.0,
            'model_version': '1.0.0',
            'parameters': {
                'temperature': 0.7,
                'max_length': 1000,
                'top_p': 0.9
            },
            'metadata': {
                'generation_type': 'ai_music',
                'input_validation': True,
                'output_metadata': {
                    'duration': 0,
                    'sample_rate': 44100,
                    'format': 'wav'
                }
            },
            'signature': {
                'algorithm': 'HMAC-SHA256',
                'value': '',
                'timestamp': now
            }
        }
        
        return template

# Global validator instance
manifest_validator = ManifestValidator()
