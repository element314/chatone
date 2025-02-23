import os
def save_file (file) :
    # Create the 'uploads' directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)

    # Save the file to a specific location
    file_path = os.path.join('uploads', file.filename)
    file.save(file_path)
    return file.filename
