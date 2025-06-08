class Hashtable:
    def __init__(self, size):
        self._size = size
        self._pairs = [None] * size

    def _hash(self, key):
        num = 0
        for item in key:
            for character in item:
                num = 31 * num + ord(character)
        return num % self._size

    def put(self, key, value):
        index = self._hash(key)
        while self._pairs[index] != None:
            if self._pairs[index][0] == key:
                self._pairs[index][1] = value
                return
            index = (index - 1) % self._size
        self._pairs[index] = [key, value]

    def get(self, key):
        index = self._hash(key)
        while self._pairs[index] is not None:
            if self._pairs[index][0] == key:
                return self._pairs[index][1]
            index = (index - 1) % self._size
        return None
    
    def __contains__(self, key):
        index = self._hash(key)
        while self._pairs[index] is not None:
            if self._pairs[index][0] == key:
                return True
            index = (index - 1) % self._size
        return False
    
    def __str__(self):
        return str(self._pairs)