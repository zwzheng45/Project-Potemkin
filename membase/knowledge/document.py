# -*- coding: utf-8 -*-
"""
Document class for representing documents in the RAG system
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class Document:
    """A class representing a document in the RAG system."""
    
    content: str
    """The main content of the document."""
    
    metadata: Dict[str, Any] = field(default_factory=dict)
    """Additional metadata about the document."""
    
    doc_id: Optional[str] = None
    """Unique identifier for the document."""
    
    created_at: datetime = field(default_factory=datetime.now)
    """Timestamp when the document was created."""
    
    updated_at: datetime = field(default_factory=datetime.now)
    """Timestamp when the document was last updated."""
    
    def update_metadata(self, key: str, value: Any) -> None:
        """
        Update a specific metadata field.
        
        Args:
            key (str): The metadata key to update
            value (Any): The new value for the metadata field
        """
        self.metadata[key] = value
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the document to a dictionary format.
        
        Returns:
            Dict[str, Any]: Dictionary representation of the document
        """
        return {
            "content": self.content,
            "metadata": self.metadata,
            "doc_id": self.doc_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Document":
        """
        Create a Document instance from a dictionary.
        
        Args:
            data (Dict[str, Any]): Dictionary containing document data
            
        Returns:
            Document: New Document instance
        """
        return cls(
            content=data["content"],
            metadata=data.get("metadata", {}),
            doc_id=data.get("doc_id"),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"])
        ) 