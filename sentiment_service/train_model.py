import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertForSequenceClassification
from torch.optim import AdamW
from transformers import get_scheduler
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
import os
import re

class EmotionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }

def preprocess_text(text):
    """Clean and preprocess text"""
    if not isinstance(text, str):
        return ""
    # Convert to lowercase
    text = text.lower()
    # Remove special characters and numbers, but keep basic punctuation
    text = re.sub(r'[^a-z\s.,!?]', '', text)
    # Normalize spacing around punctuation
    text = re.sub(r'\s*([.,!?])\s*', r'\1 ', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def augment_text(text):
    """Simple text augmentation techniques"""
    augmented = []
    words = text.split()
    
    if len(words) <= 3:  # Don't augment very short texts
        return [text]
    
    # Original text
    augmented.append(text)
    
    # Remove random word
    if len(words) > 4:
        remove_idx = np.random.randint(0, len(words))
        aug_text = ' '.join(words[:remove_idx] + words[remove_idx+1:])
        augmented.append(aug_text)
    
    # Shuffle word order slightly (only adjacent words)
    words_copy = words.copy()
    for i in range(len(words_copy)-1):
        if np.random.random() < 0.3:  # 30% chance to swap
            words_copy[i], words_copy[i+1] = words_copy[i+1], words_copy[i]
    aug_text = ' '.join(words_copy)
    augmented.append(aug_text)
    
    return augmented

def load_and_preprocess_data(file_path):
    """Load and preprocess the dataset"""
    print("Loading dataset...")
    try:
        df = pd.read_csv(file_path)
        print("Dataset loaded successfully!")
    except Exception as e:
        print(f"Error loading dataset: {e}")
        raise
    
    # Ensure we have the required columns
    required_columns = {'text', 'emotion'}
    if not all(col in df.columns for col in required_columns):
        raise ValueError(f"Dataset must contain columns: {required_columns}")
    
    # Remove any rows with missing values
    df = df.dropna(subset=['text', 'emotion'])
    
    # Preprocess texts
    print("Preprocessing texts...")
    df['text'] = df['text'].apply(preprocess_text)
    df = df[df['text'].str.len() > 0]  # Remove empty texts
    
    # Augment data
    print("Augmenting dataset...")
    augmented_texts = []
    augmented_emotions = []
    
    for text, emotion in zip(df['text'], df['emotion']):
        aug_texts = augment_text(text)
        augmented_texts.extend(aug_texts)
        augmented_emotions.extend([emotion] * len(aug_texts))
    
    print(f"Original dataset size: {len(df)}")
    print(f"Augmented dataset size: {len(augmented_texts)}")
    print("\nClass distribution:")
    emotion_counts = pd.Series(augmented_emotions).value_counts()
    print(emotion_counts)
    
    return np.array(augmented_texts), np.array(augmented_emotions)

def train_epoch(model, data_loader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0
    
    for batch in data_loader:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)
        
        optimizer.zero_grad()
        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )
        
        loss = outputs.loss
        total_loss += loss.item()
        
        _, predicted = torch.max(outputs.logits, dim=1)
        correct_predictions += (predicted == labels).sum().item()
        total_predictions += labels.size(0)
        
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
    
    return total_loss / len(data_loader), correct_predictions / total_predictions

def evaluate(model, data_loader, device):
    model.eval()
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0
    
    with torch.no_grad():
        for batch in data_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)
            
            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )
            
            loss = outputs.loss
            total_loss += loss.item()
            
            _, predicted = torch.max(outputs.logits, dim=1)
            correct_predictions += (predicted == labels).sum().item()
            total_predictions += labels.size(0)
    
    return total_loss / len(data_loader), correct_predictions / total_predictions

def train_sentiment_model(dataset_path):
    """Main function to train and save the model"""
    # Create model directory
    os.makedirs('model', exist_ok=True)
    
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    try:
        # Load and preprocess data
        texts, labels = load_and_preprocess_data(dataset_path)
        
        # Encode labels
        label_encoder = LabelEncoder()
        encoded_labels = label_encoder.fit_transform(labels)
        num_labels = len(label_encoder.classes_)
        
        # Save label encoder classes
        np.save('model/label_encoder_classes.npy', label_encoder.classes_)
        print("Emotion classes:", label_encoder.classes_)
        
        # Load BERT tokenizer and model
        print("\nLoading BERT model and tokenizer...")
        model_name = 'bert-base-uncased'
        tokenizer = BertTokenizer.from_pretrained(model_name)
        model = BertForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            problem_type="single_label_classification"
        )
        
        # Freeze most BERT layers but unfreeze the last 2 transformer blocks
        for param in model.bert.embeddings.parameters():
            param.requires_grad = False
        
        for i, layer in enumerate(model.bert.encoder.layer):
            if i < 10:  # Freeze first 10 layers
                for param in layer.parameters():
                    param.requires_grad = False
        
        model.to(device)
        print("BERT model loaded successfully!")
        
        # Split the data
        train_texts, val_texts, train_labels, val_labels = train_test_split(
            texts,
            encoded_labels,
            test_size=0.2,
            random_state=42,
            stratify=encoded_labels
        )
        
        # Create datasets
        print("\nPreparing datasets...")
        train_dataset = EmotionDataset(train_texts, train_labels, tokenizer)
        val_dataset = EmotionDataset(val_texts, val_labels, tokenizer)
        
        # Create data loaders
        train_loader = DataLoader(
            train_dataset,
            batch_size=16,
            shuffle=True
        )
        val_loader = DataLoader(
            val_dataset,
            batch_size=16
        )
        print("Datasets prepared successfully!")
        
        # Training settings
        num_epochs = 10  # Increased epochs
        warmup_steps = len(train_loader) * 2  # 2 epochs of warmup
        total_steps = len(train_loader) * num_epochs
        
        # Layer-wise learning rates
        optimizer_grouped_parameters = [
            {
                'params': [p for n, p in model.named_parameters() if 'classifier' in n],
                'lr': 2e-4,
                'weight_decay': 0.01
            },
            {
                'params': [p for n, p in model.named_parameters() if 'layer.11' in n],
                'lr': 1e-4,
                'weight_decay': 0.01
            },
            {
                'params': [p for n, p in model.named_parameters() if 'layer.10' in n],
                'lr': 5e-5,
                'weight_decay': 0.01
            }
        ]
        
        optimizer = AdamW(optimizer_grouped_parameters)
        scheduler = get_scheduler(
            name="linear",
            optimizer=optimizer,
            num_warmup_steps=warmup_steps,
            num_training_steps=total_steps
        )
        
        best_accuracy = 0
        
        # Training loop
        print("\nStarting training...")
        for epoch in range(num_epochs):
            print(f"\nEpoch {epoch + 1}/{num_epochs}")
            
            # Train
            train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, device)
            print(f"Training - Loss: {train_loss:.4f}, Accuracy: {train_acc:.4f}")
            
            # Evaluate
            val_loss, val_acc = evaluate(model, val_loader, device)
            print(f"Validation - Loss: {val_loss:.4f}, Accuracy: {val_acc:.4f}")
            
            # Save best model
            if val_acc > best_accuracy:
                best_accuracy = val_acc
                print("Saving best model...")
                model.save_pretrained('model/best_model')
                tokenizer.save_pretrained('model/best_model')
        
        print(f"\nBest validation accuracy: {best_accuracy:.4f}")
        
        # Save model configuration
        model_config = {
            'model_name': model_name,
            'num_labels': num_labels,
            'max_length': 128,
            'label_mapping': {i: label for i, label in enumerate(label_encoder.classes_)}
        }
        with open('model/model_config.json', 'w') as f:
            json.dump(model_config, f)
        print("Model configuration saved!")
        
    except Exception as e:
        print(f"\nError during training: {e}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python train_model.py <dataset_path>")
        sys.exit(1)
    
    try:
        train_sentiment_model(sys.argv[1])
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
