#!/usr/bin/env python3
"""
VaultQA API Client Example (Python)

This script demonstrates how to interact with the VaultQA API server using Python.
Make sure the Obsidian Copilot plugin is running with the API server enabled.

Requirements:
    pip install requests

Usage:
    python vault_qa_client.py "What are the main topics in my vault?"
"""

import sys
import json
import requests
from typing import Dict, List, Optional, Any


class VaultQAClient:
    """Client for interacting with the VaultQA API server."""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize the VaultQA client.
        
        Args:
            base_url: Base URL of the VaultQA API server
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'VaultQA-Python-Client/1.0'
        })
        self.timeout = 60  # 60 second timeout
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if the API server is healthy.
        
        Returns:
            Dict containing server status and timestamp
            
        Raises:
            requests.RequestException: If the health check fails
        """
        try:
            response = self.session.get(
                f"{self.base_url}/health",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise requests.RequestException(f"Health check failed: {e}")
    
    def get_vault_info(self) -> Dict[str, Any]:
        """
        Get vault information.
        
        Returns:
            Dict containing vault information
            
        Raises:
            requests.RequestException: If the request fails
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/vault-info",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise requests.RequestException(f"Failed to get vault info: {e}")
    
    def ask_question(
        self,
        question: str,
        max_source_chunks: int = 10,
        debug: bool = False
    ) -> Dict[str, Any]:
        """
        Ask a question about the vault content.
        
        Args:
            question: The question to ask
            max_source_chunks: Maximum number of source chunks to retrieve
            debug: Enable debug mode
            
        Returns:
            Dict containing the answer, sources, and success status
            
        Raises:
            requests.RequestException: If the request fails
        """
        payload = {
            "question": question,
            "options": {
                "maxSourceChunks": max_source_chunks,
                "debug": debug
            }
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/vault-qa",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('error', e.response.text)
                except (json.JSONDecodeError, AttributeError):
                    error_msg = e.response.text or str(e)
                raise requests.RequestException(f"API Error: {error_msg}")
            raise requests.RequestException(f"Request failed: {e}")


def main():
    """Main function to demonstrate the VaultQA client."""
    client = VaultQAClient()
    
    try:
        print("🔍 Checking API server health...")
        health = client.health_check()
        print(f"✅ Server is healthy: {health}")
        
        print("\n📊 Getting vault information...")
        vault_info = client.get_vault_info()
        print(f"📚 Vault Info:")
        print(f"  Name: {vault_info.get('name', 'Unknown')}")
        print(f"  Total Files: {vault_info.get('totalFiles', 0)}")
        print(f"  Semantic Search: {'Enabled' if vault_info.get('semanticSearchEnabled') else 'Disabled'}")
        print(f"  Max Source Chunks: {vault_info.get('maxSourceChunks', 0)}")
        
        print("\n❓ Asking a question...")
        # Use command line argument or default question
        question = sys.argv[1] if len(sys.argv) > 1 else "What are the main topics covered in my vault?"
        print(f'Question: "{question}"')
        
        answer_data = client.ask_question(
            question=question,
            max_source_chunks=15,
            debug=False
        )
        
        print(f"\n🤖 Answer: {answer_data['answer']}")
        
        if answer_data.get('sources'):
            print(f"\n📖 Sources ({len(answer_data['sources'])}):")
            for i, source in enumerate(answer_data['sources'], 1):
                print(f"  {i}. {source}")
        else:
            print("\n📖 No sources found")
            
    except requests.RequestException as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()