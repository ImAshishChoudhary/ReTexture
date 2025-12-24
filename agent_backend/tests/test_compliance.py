"""
Test script for compliance checking API.
Usage: python test_compliance.py <image_path>
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


async def test_compliance_check(api_url: str, image_path: str):
    """Test the /check_compliance endpoint."""
    print(f"\n{'='*60}")
    print(f"Testing Compliance Check API")
    print(f"{'='*60}")
    print(f"API URL: {api_url}/check_compliance")
    print(f"Image: {image_path}")
    print(f"{'='*60}\n")
    
    # Encode the image
    print("Encoding image to base64...")
    image_base64 = encode_image_to_base64(image_path)
    print(f"✓ Image encoded ({len(image_base64)} characters)\n")
    
    # Create sample HTML (you can modify this)
    sample_html = """
    <div class="canvas">
        <h1 style="font-family: 'Comic Sans MS'">Summer Sale!</h1>
        <img src="product.jpg" />
        <p style="color: #FF5733">50% OFF</p>
    </div>
    """
    html_base64 = encode_html_to_base64(sample_html)
    
    # Prepare request payload
    payload = {
        "canvas_html": html_base64,
        "canvas_image": image_base64
    }
    
    # Send request
    print("Sending request to API...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{api_url}/check_compliance",
                json=payload
            )
            
            print(f"✓ Response received (Status: {response.status_code})\n")
            
            if response.status_code == 200:
                result = response.json()
                print(f"{'='*60}")
                print("COMPLIANCE CHECK RESULTS")
                print(f"{'='*60}\n")
                print(json.dumps(result, indent=2))
                print(f"\n{'='*60}")
                
                # Print summary
                if "summary" in result:
                    summary = result["summary"]
                    print(f"\nSUMMARY:")
                    print(f"  Total Checks: {summary.get('total_checks', 0)}")
                    print(f"  Passed: {summary.get('passed', 0)} ✓")
                    print(f"  Failed: {summary.get('failed', 0)} ✗")
                    print(f"  Overall Compliant: {result.get('overall_compliant', False)}")
                print(f"{'='*60}\n")
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
                
        except httpx.ConnectError:
            print("✗ Error: Could not connect to API. Is the server running?")
            print(f"  Make sure to start the API server first:")
            print(f"  python api.py")
            sys.exit(1)
        except Exception as e:
            print(f"✗ Error: {e}")
            sys.exit(1)


async def test_background_removal(api_url: str, image_path: str):
    """Test the /remove_background endpoint."""
    print(f"\n{'='*60}")
    print(f"Testing Background Removal API")
    print(f"{'='*60}")
    print(f"API URL: {api_url}/remove_background")
    print(f"Image: {image_path}")
    print(f"{'='*60}\n")
    
    # Encode the image
    print("Encoding image to base64...")
    image_base64 = encode_image_to_base64(image_path)
    print(f"✓ Image encoded ({len(image_base64)} characters)\n")
    
    # Create sample HTML
    sample_html = "<div class='canvas'><img src='image.jpg' /></div>"
    html_base64 = encode_html_to_base64(sample_html)
    
    # Prepare request payload
    payload = {
        "canvas_html": html_base64,
        "canvas_image": image_base64
    }
    
    # Send request
    print("Sending request to API...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{api_url}/remove_background",
                json=payload
            )
            
            print(f"✓ Response received (Status: {response.status_code})\n")
            
            if response.status_code == 200:
                result = response.json()
                # Don't print the full image data, just the metadata
                result_display = result.copy()
                if "processed_image" in result_display:
                    img_len = len(result_display["processed_image"])
                    result_display["processed_image"] = f"<base64_data: {img_len} characters>"
                
                print(f"{'='*60}")
                print("BACKGROUND REMOVAL RESULTS")
                print(f"{'='*60}\n")
                print(json.dumps(result_display, indent=2))
                print(f"\n{'='*60}\n")
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
                
        except httpx.ConnectError:
            print("✗ Error: Could not connect to API. Is the server running?")
            print(f"  Make sure to start the API server first:")
            print(f"  python api.py")
            sys.exit(1)
        except Exception as e:
            print(f"✗ Error: {e}")
            sys.exit(1)


async def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python test_compliance.py <image_path> [api_url]")
        print("\nExample:")
        print("  python test_compliance.py ./test_image.png")
        print("  python test_compliance.py ./test_image.png http://localhost:8000")
        sys.exit(1)
    
    image_path = sys.argv[1]
    api_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000"
    
    # Verify image exists
    if not Path(image_path).exists():
        print(f"Error: Image file not found: {image_path}")
        sys.exit(1)
    
    # Run tests
    await test_compliance_check(api_url, image_path)
    await test_background_removal(api_url, image_path)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
