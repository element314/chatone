import whisper

def whisper_transcribation (file_name) :
    print('start_______')
    
    model = whisper.load_model("base")
    result = model.transcribe('uploads/'+file_name, fp16=False)
    print(result)
    return result["text"]