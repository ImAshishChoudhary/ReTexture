from rembg import remove
import os

def remove_background_service(input_path: str, output_path: str) -> bool:
    try:
        # Read the file in binary mode
        with open(input_path, "rb") as input_file:
            input_data = input_file.read()
        
        # The magic happens here
        output_data = remove(input_data)
        
        # Save the result
        with open(output_path, "wb") as output_file:
            output_file.write(output_data)
            
        return True
    except Exception as e:
        print(f"Service Error: {e}")
        return False