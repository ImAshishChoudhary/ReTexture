"""
Test script for background removal API.
Usage: python test_background_removal.py <image_path>
"""
import httpx
import base64
import sys
import json
from pathlib import Path


def encode_image_to_base64(image_path: str) -> str:
    """Encode image file to base64 string."""
    try:
        with open(image_path, "rb") as image_file:
            encoded = base64.b64encode(image_file.read()).decode('utf-8')
            return encoded
    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error encoding image: {e}")
        sys.exit(1)


def encode_html_to_base64(html_content: str) -> str:
    """Encode HTML string to base64."""
    return base64.b64encode(html_content.encode('utf-8')).decode('utf-8')


def save_base64_image(base64_string: str, output_path: str):
    """Save base64 encoded image to file."""
    try:
        image_data = base64.b64decode(base64_string)
        with open(output_path, "wb") as f:
            f.write(image_data)
        print(f"✓ Processed image saved to: {output_path}")
    except Exception as e:
        print(f"✗ Error saving image: {e}")


async def test_background_removal(api_url: str, image_path: str, save_output: bool = False):
    """Test the /remove_background endpoint."""
    print(f"\n{'='*70}")
    print(f"TESTING BACKGROUND REMOVAL API")
    print(f"{'='*70}")
    print(f"API URL: {api_url}/remove_background")
    print(f"Image: {image_path}")
    print(f"{'='*70}\n")
    
    # Encode the image
    print("📷 Encoding image to base64...")
    image_base64 = encode_image_to_base64(image_path)
    image_size_kb = len(image_base64) * 3 / 4 / 1024  # Approximate size in KB
    print(f"✓ Image encoded successfully")
    print(f"  - Base64 length: {len(image_base64):,} characters")
    print(f"  - Approximate size: {image_size_kb:.2f} KB\n")
    
    # Create sample HTML
    sample_html = """
    <div class="canvas" style="width: 1920px; height: 1080px;">
        <img src="image.jpg" alt="Canvas Image" />
    </div>
    """
    html_base64 = encode_html_to_base64(sample_html)
    print(f"📝 HTML encoded to base64 ({len(html_base64)} characters)\n")
    
    # Prepare request payload
    payload = {
        "canvas_html": html_base64,
        "canvas_image": image_base64
    }
    
    # Send request
    print("🚀 Sending request to API...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{api_url}/remove_background",
                json=payload
            )
            
            print(f"✓ Response received (Status: {response.status_code})\n")
            
            if response.status_code == 200:
                result = response.json()
                
                # Prepare display version (hide long base64 data)
                result_display = result.copy()
                processed_image_data = None
                
                if "processed_image" in result_display:
                    processed_image_data = result_display["processed_image"]
                    img_len = len(processed_image_data)
                    result_display["processed_image"] = f"<base64_image_data: {img_len:,} characters>"
                
                print(f"{'='*70}")
                print("BACKGROUND REMOVAL RESULTS")
                print(f"{'='*70}\n")
                print(json.dumps(result_display, indent=2))
                print(f"\n{'='*70}")
                
                # Print detailed summary
                if "processing_details" in result:
                    details = result["processing_details"]
                    print(f"\n📊 PROCESSING DETAILS:")
                    print(f"  • Original Size: {details.get('original_size', 'N/A')}")
                    print(f"  • Processed Size: {details.get('processed_size', 'N/A')}")
                    print(f"  • Background Removed: {details.get('background_removed', False)} {'✓' if details.get('background_removed') else '✗'}")
                    print(f"  • Processing Time: {details.get('processing_time_ms', 0)} ms")
                
                print(f"\n{'='*70}")
                print(f"Status: {result.get('status', 'unknown').upper()}")
                print(f"Message: {result.get('message', 'N/A')}")
                print(f"{'='*70}\n")
                
                # Optionally save the processed image
                if save_output and processed_image_data:
                    output_path = str(Path(image_path).parent / f"processed_{Path(image_path).name}")
                    save_base64_image(processed_image_data, output_path)
                elif save_output:
                    print("⚠ No processed image data to save")
                    
            else:
                print(f"{'='*70}")
                print(f"❌ ERROR: {response.status_code}")
                print(f"{'='*70}")
                print(response.text)
                print(f"{'='*70}\n")
                
        except httpx.ConnectError:
            print(f"\n{'='*70}")
            print("❌ CONNECTION ERROR")
            print(f"{'='*70}")
            print("Could not connect to API. Is the server running?")
            print("\nTo start the server, run:")
            print("  cd agent_backend")
            print("  python api.py")
            print(f"{'='*70}\n")
            sys.exit(1)
        except httpx.TimeoutException:
            print(f"\n{'='*70}")
            print("⏱️  TIMEOUT ERROR")
            print(f"{'='*70}")
            print("The request timed out. The server might be processing...")
            print(f"{'='*70}\n")
            sys.exit(1)
        except Exception as e:
            print(f"\n{'='*70}")
            print(f"❌ UNEXPECTED ERROR")
            print(f"{'='*70}")
            print(f"Error: {e}")
            print(f"{'='*70}\n")
            sys.exit(1)


async def main():
    """Main function."""
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("\n" + "="*70)
        print("Background Removal API Test Script")
        print("="*70)
        print("\nUsage: python test_background_removal.py <image_path> [options]")
        print("\nArguments:")
        print("  image_path    Path to the image file to process")
        print("\nOptions:")
        print("  --api-url URL    API base URL (default: http://localhost:8000)")
        print("  --save-output    Save the processed image to disk")
        print("\nExamples:")
        print("  python test_background_removal.py ./test_image.png")
        print("  python test_background_removal.py ./photo.jpg --save-output")
        print("  python test_background_removal.py ./image.png --api-url http://localhost:8000 --save-output")
        print("="*70 + "\n")
        sys.exit(1)
    
    image_path = sys.argv[1]
    api_url = "http://localhost:8000"
    save_output = False
    
    # Parse optional arguments
    for i, arg in enumerate(sys.argv[2:], start=2):
        if arg == "--api-url" and i + 1 < len(sys.argv):
            api_url = sys.argv[i + 1]
        elif arg == "--save-output":
            save_output = True
    
    # Verify image exists
    if not Path(image_path).exists():
        print(f"\n❌ Error: Image file not found: {image_path}\n")
        sys.exit(1)
    
    # Run test
    await test_background_removal(api_url, image_path, save_output)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
