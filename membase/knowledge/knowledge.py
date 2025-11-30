# -*- coding: utf-8 -*-
"""
Base class for RAG (Retrieval-Augmented Generation) system
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Union
from .document import Document


class KnowledgeBase(ABC):
    """Base class for RAG system."""

    _version: int = 1

    @abstractmethod
    def add_documents(
        self,
        documents: Union[Document, List[Document]],
    ) -> None:
        """
        Add documents to the knowledge base.
        
        Args:
            documents: Single document or list of documents to add
        """

    @abstractmethod
    def update_documents(
        self,
        documents: Union[Document, List[Document]],
    ) -> None:
        """
        Update existing documents in the knowledge base.
        
        Args:
            documents: Single document or list of documents to update
        """

    @abstractmethod
    def delete_documents(
        self,
        document_ids: Union[str, List[str]],
    ) -> None:
        """
        Delete documents from the knowledge base.
        
        Args:
            document_ids: Single document ID or list of document IDs to delete
        """

    @abstractmethod
    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        **kwargs: Any,
    ) -> List[Document]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: The input query
            top_k: Number of documents to retrieve
            **kwargs: Additional retrieval parameters
            
        Returns:
            List of relevant documents
        """

    @abstractmethod
    def load(
        self,
        path: str,
        **kwargs: Any,
    ) -> None:
        """
        Load the RAG system from a saved state.
        
        Args:
            path (str):
                Path to the saved state.
            **kwargs:
                Additional loading parameters.
        """

    @abstractmethod
    def save(
        self,
        path: str,
        **kwargs: Any,
    ) -> None:
        """
        Save the current state of the RAG system.
        
        Args:
            path (str):
                Path to save the state.
            **kwargs:
                Additional saving parameters.
        """

    @abstractmethod
    def clear(self) -> None:
        """Clear all data from the RAG system."""

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the RAG system.
        
        Returns:
            Dict[str, Any]:
                Dictionary containing various statistics.
        """ 