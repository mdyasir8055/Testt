"""
PDF processing service using PyMuPDF for text and image extraction.
"""
import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from typing import List, Dict, Tuple, Optional
import base64
import os

class PDFProcessor:
    def __init__(self):
        self.supported_formats = ['pdf']
    
    def extract_content(self, pdf_path: str) -> Dict:
        """
        Extract text and images from PDF file with industry auto-detection.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dict containing extracted content, metadata, images, and detected industry
        """
        try:
            doc = fitz.open(pdf_path)
            
            extracted_content = {
                'text_content': [],
                'images': [],
                'metadata': {
                    'page_count': len(doc),
                    'title': doc.metadata.get('title', ''),
                    'author': doc.metadata.get('author', ''),
                    'subject': doc.metadata.get('subject', ''),
                },
                'industry': 'general',
                'confidence_score': 0.0
            }
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Extract text
                text = page.get_text()
                if text.strip():
                    extracted_content['text_content'].append({
                        'page': page_num + 1,
                        'text': text,
                        'bbox': None  # Could add bounding box info if needed
                    })
                
                # Extract images
                image_list = page.get_images()
                for img_index, img in enumerate(image_list):
                    try:
                        # Get image data
                        xref = img[0]
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        
                        # Convert to PIL Image for processing
                        image = Image.open(io.BytesIO(image_bytes))
                        
                        # OCR on image if it might contain text
                        ocr_text = self._perform_ocr(image)
                        
                        # Convert to base64 for storage
                        buffered = io.BytesIO()
                        image.save(buffered, format="PNG")
                        img_base64 = base64.b64encode(buffered.getvalue()).decode()
                        
                        extracted_content['images'].append({
                            'page': page_num + 1,
                            'index': img_index,
                            'image_data': img_base64,
                            'ocr_text': ocr_text,
                            'width': image.width,
                            'height': image.height,
                        })
                        
                    except Exception as e:
                        print(f"Error extracting image {img_index} from page {page_num + 1}: {e}")
            
            doc.close()
            return extracted_content
            
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
    
    def _perform_ocr(self, image: Image.Image) -> str:
        """
        Perform OCR on an image to extract text.
        
        Args:
            image: PIL Image object
            
        Returns:
            Extracted text string
        """
        try:
            # Only perform OCR if tesseract is available
            if self._is_tesseract_available():
                text = pytesseract.image_to_string(image)
                return text.strip()
            return ""
        except Exception as e:
            print(f"OCR error: {e}")
            return ""
    
    def _is_tesseract_available(self) -> bool:
        """Check if Tesseract OCR is available on the system."""
        try:
            pytesseract.get_tesseract_version()
            return True
        except:
            return False
    
    def chunk_text(self, text_content: List[Dict], chunk_size: int = 750, overlap: int = 100) -> List[Dict]:
        """
        Split text content into chunks for vector storage.
        
        Args:
            text_content: List of page text content
            chunk_size: Target size for each chunk (in tokens, roughly)
            overlap: Number of tokens to overlap between chunks
            
        Returns:
            List of text chunks with metadata
        """
        chunks = []
        chunk_id = 0
        
        for page_content in text_content:
            page_num = page_content['page']
            text = page_content['text']
            
            # Simple word-based chunking (rough token estimation)
            words = text.split()
            
            i = 0
            while i < len(words):
                # Take chunk_size words
                chunk_words = words[i:i + chunk_size]
                chunk_text = ' '.join(chunk_words)
                
                chunks.append({
                    'chunk_id': chunk_id,
                    'text': chunk_text,
                    'page': page_num,
                    'start_word': i,
                    'end_word': min(i + chunk_size, len(words)),
                    'word_count': len(chunk_words)
                })
                
                chunk_id += 1
                
                # Move forward by chunk_size - overlap
                i += max(1, chunk_size - overlap)
        
        return chunks
    
    def detect_industry(self, text_content: List[Dict]) -> Optional[str]:
        """
        Detect document industry based on keywords and content analysis.
        
        Args:
            text_content: List of page text content
            
        Returns:
            Detected industry string or None
        """
        # Combine all text
        full_text = ' '.join([page['text'].lower() for page in text_content])
        
        # Industry keyword mappings
        industry_keywords = {
            'medical': ['patient', 'diagnosis', 'treatment', 'medical', 'hospital', 'doctor', 'medicine', 'clinical', 'therapy', 'healthcare'],
            'finance': ['investment', 'financial', 'loan', 'bank', 'credit', 'portfolio', 'revenue', 'profit', 'accounting', 'fiscal'],
            'retail': ['product', 'customer', 'sale', 'price', 'inventory', 'retail', 'shopping', 'merchandise', 'store', 'brand'],
            'education': ['student', 'course', 'curriculum', 'learning', 'education', 'academic', 'university', 'school', 'teaching', 'study'],
            'legal': ['contract', 'legal', 'court', 'law', 'agreement', 'clause', 'attorney', 'litigation', 'compliance', 'regulation']
        }
        
        # Score each industry
        industry_scores = {}
        for industry, keywords in industry_keywords.items():
            score = sum(1 for keyword in keywords if keyword in full_text)
            industry_scores[industry] = score
        
        # Return industry with highest score if above threshold
        max_industry = max(industry_scores.keys(), key=lambda k: industry_scores[k])
        max_score = industry_scores[max_industry]
        
        # Require at least 3 keyword matches
        if max_score >= 3:
            return max_industry
        
        return None

# Example usage
if __name__ == "__main__":
    processor = PDFProcessor()
    
    # Test with a sample PDF
    try:
        content = processor.extract_content("sample.pdf")
        print(f"Extracted {len(content['text_content'])} pages of text")
        print(f"Extracted {len(content['images'])} images")
        
        chunks = processor.chunk_text(content['text_content'])
        print(f"Created {len(chunks)} text chunks")
        
        industry = processor.detect_industry(content['text_content'])
        print(f"Detected industry: {industry}")
        
    except Exception as e:
        print(f"Error: {e}")
